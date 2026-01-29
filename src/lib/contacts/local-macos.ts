// Local macOS Contacts Provider
// Uses the AddressBook SQLite database for contact resolution
// 
// USAGE: Development and self-hosted deployments on macOS
// REQUIRES: Full Disk Access for the process reading contacts

import type { Contact, ContactsProvider } from './index'
import { normalizePhone } from './index'
import { getGatewayUrl, getGatewayToken } from '../config'

// Cache to avoid repeated lookups
const cache = new Map<string, Contact | null>()

async function execCommand(command: string): Promise<string> {
  const response = await fetch(`${getGatewayUrl()}/tools/invoke`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getGatewayToken()}`,
    },
    body: JSON.stringify({ tool: 'exec', args: { command } }),
  })
  
  const data = await response.json()
  if (data.ok && data.result?.content?.[0]?.text) {
    return data.result.content[0].text
  }
  return ''
}

export class LocalMacOSProvider implements ContactsProvider {
  
  async lookup(phone: string): Promise<Contact | null> {
    const normalized = normalizePhone(phone)
    
    // Check cache
    if (cache.has(normalized)) {
      return cache.get(normalized) || null
    }
    
    try {
      // Query macOS AddressBook database
      const query = `sqlite3 ~/Library/Application\\ Support/AddressBook/Sources/*/AddressBook-v22.abcddb "SELECT ZFIRSTNAME, ZLASTNAME FROM ZABCDRECORD r JOIN ZABCDPHONENUMBER p ON p.ZOWNER = r.Z_PK WHERE p.ZFULLNUMBER LIKE '%${normalized}%' LIMIT 1" 2>/dev/null`
      
      const output = await execCommand(query)
      
      if (output.trim()) {
        const [firstName = '', lastName = ''] = output.trim().split('|')
        const contact: Contact = {
          id: `local:${normalized}`,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          fullName: `${firstName.trim()} ${lastName.trim()}`.trim(),
          phones: [phone],
        }
        cache.set(normalized, contact)
        return contact
      }
    } catch (err) {
      console.error('Contact lookup failed:', err)
    }
    
    cache.set(normalized, null)
    return null
  }
  
  async lookupBatch(phones: string[]): Promise<Map<string, Contact | null>> {
    const results = new Map<string, Contact | null>()
    
    // For local provider, just do parallel lookups
    // (Could optimize with single SQL query if needed)
    await Promise.all(
      phones.map(async (phone) => {
        const contact = await this.lookup(phone)
        results.set(normalizePhone(phone), contact)
      })
    )
    
    return results
  }
  
  async search(query: string): Promise<Contact[]> {
    try {
      // Search by name
      const sqlQuery = `sqlite3 ~/Library/Application\\ Support/AddressBook/Sources/*/AddressBook-v22.abcddb "SELECT ZFIRSTNAME, ZLASTNAME, (SELECT GROUP_CONCAT(ZFULLNUMBER) FROM ZABCDPHONENUMBER WHERE ZOWNER = r.Z_PK) FROM ZABCDRECORD r WHERE ZFIRSTNAME LIKE '%${query}%' OR ZLASTNAME LIKE '%${query}%' LIMIT 20" 2>/dev/null`
      
      const output = await execCommand(sqlQuery)
      
      if (!output.trim()) return []
      
      return output.trim().split('\n').map((line, idx) => {
        const [firstName = '', lastName = '', phones = ''] = line.split('|')
        return {
          id: `local:search:${idx}`,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          fullName: `${firstName.trim()} ${lastName.trim()}`.trim(),
          phones: phones.split(',').filter(Boolean),
        }
      })
    } catch (err) {
      console.error('Contact search failed:', err)
      return []
    }
  }
}
