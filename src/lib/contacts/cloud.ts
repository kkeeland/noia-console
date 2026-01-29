// Cloud Contacts Provider
// For production SaaS - contacts synced from user's phone
//
// FLOW:
// 1. User installs Noia mobile app (or OAuth connects phone)
// 2. User grants contacts permission
// 3. App syncs contacts to Noia backend (encrypted, user-owned)
// 4. This provider queries the backend API
//
// PRIVACY:
// - Contacts are encrypted at rest
// - User can delete anytime
// - We never share or sell contact data
// - User owns their data

import type { Contact, ContactsProvider } from './index'
import { normalizePhone } from './index'

interface CloudProviderConfig {
  apiUrl: string
  apiKey?: string
  userId: string
}

export class CloudProvider implements ContactsProvider {
  private config: CloudProviderConfig
  private cache = new Map<string, Contact | null>()
  
  constructor(config: CloudProviderConfig) {
    this.config = config
  }
  
  async lookup(phone: string): Promise<Contact | null> {
    const normalized = normalizePhone(phone)
    
    // Check cache
    if (this.cache.has(normalized)) {
      return this.cache.get(normalized) || null
    }
    
    try {
      const response = await fetch(`${this.config.apiUrl}/contacts/lookup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
        },
        body: JSON.stringify({
          userId: this.config.userId,
          phone: normalized,
        }),
      })
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.contact) {
        this.cache.set(normalized, data.contact)
        return data.contact
      }
    } catch (err) {
      console.error('Cloud contact lookup failed:', err)
    }
    
    this.cache.set(normalized, null)
    return null
  }
  
  async lookupBatch(phones: string[]): Promise<Map<string, Contact | null>> {
    const results = new Map<string, Contact | null>()
    const uncached: string[] = []
    
    // Check cache first
    for (const phone of phones) {
      const normalized = normalizePhone(phone)
      if (this.cache.has(normalized)) {
        results.set(normalized, this.cache.get(normalized) || null)
      } else {
        uncached.push(normalized)
      }
    }
    
    // Batch lookup uncached
    if (uncached.length > 0) {
      try {
        const response = await fetch(`${this.config.apiUrl}/contacts/lookup-batch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
          },
          body: JSON.stringify({
            userId: this.config.userId,
            phones: uncached,
          }),
        })
        
        if (response.ok) {
          const data = await response.json()
          
          for (const [phone, contact] of Object.entries(data.contacts || {})) {
            this.cache.set(phone, contact as Contact)
            results.set(phone, contact as Contact)
          }
        }
      } catch (err) {
        console.error('Cloud batch lookup failed:', err)
      }
    }
    
    // Fill in nulls for anything not found
    for (const phone of phones) {
      const normalized = normalizePhone(phone)
      if (!results.has(normalized)) {
        results.set(normalized, null)
      }
    }
    
    return results
  }
  
  async search(query: string): Promise<Contact[]> {
    try {
      const response = await fetch(`${this.config.apiUrl}/contacts/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
        },
        body: JSON.stringify({
          userId: this.config.userId,
          query,
          limit: 20,
        }),
      })
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }
      
      const data = await response.json()
      return data.contacts || []
    } catch (err) {
      console.error('Cloud contact search failed:', err)
      return []
    }
  }
}
