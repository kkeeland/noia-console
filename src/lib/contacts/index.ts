// Contacts Provider - abstracted for product scalability
// 
// ARCHITECTURE:
// - ContactsProvider interface defines the contract
// - LocalMacOSProvider: development/self-hosted (Kevin's setup)
// - CloudProvider: production SaaS (synced from mobile app)
//
// For the product, users will:
// 1. Connect their phone (OAuth or mobile app)
// 2. Grant contacts permission
// 3. Contacts sync to our backend
// 4. This provider queries the backend instead of local files

export interface Contact {
  id: string
  firstName: string
  lastName: string
  fullName: string
  phones: string[]
  emails?: string[]
  avatarUrl?: string
}

export interface ContactsProvider {
  lookup(phone: string): Promise<Contact | null>
  lookupBatch(phones: string[]): Promise<Map<string, Contact | null>>
  search(query: string): Promise<Contact[]>
}

// Normalize phone number for comparison (last 10 digits)
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10)
}

// Format phone number for display
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  if (digits.length === 11 && digits[0] === '1') {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  return phone
}

// Get display name (contact name or formatted phone)
export function getDisplayName(contact: Contact | null, phone: string): string {
  if (contact?.fullName) {
    return contact.fullName
  }
  return formatPhone(phone)
}

// Re-export providers
export { LocalMacOSProvider } from './local-macos'
export { CloudProvider } from './cloud'

// Default provider (configured at app init)
let activeProvider: ContactsProvider | null = null

export function setContactsProvider(provider: ContactsProvider) {
  activeProvider = provider
}

export function getContactsProvider(): ContactsProvider {
  if (!activeProvider) {
    throw new Error('Contacts provider not initialized. Call setContactsProvider() first.')
  }
  return activeProvider
}

// Convenience functions using active provider
export async function lookupContact(phone: string): Promise<Contact | null> {
  return getContactsProvider().lookup(phone)
}

export async function lookupContacts(phones: string[]): Promise<Map<string, Contact | null>> {
  return getContactsProvider().lookupBatch(phones)
}

export async function searchContacts(query: string): Promise<Contact[]> {
  return getContactsProvider().search(query)
}
