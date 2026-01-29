// Initialize contacts provider based on environment
//
// Development (Kevin): LocalMacOSProvider
// Production SaaS: CloudProvider

import { setContactsProvider } from './index'
import { LocalMacOSProvider } from './local-macos'
import { CloudProvider } from './cloud'

export function initContactsProvider() {
  const mode = import.meta.env.VITE_CONTACTS_MODE || 'local'
  
  if (mode === 'cloud') {
    // Production: use cloud backend
    const apiUrl = import.meta.env.VITE_API_URL
    const userId = import.meta.env.VITE_USER_ID
    
    if (!apiUrl || !userId) {
      console.warn('Cloud contacts mode requires VITE_API_URL and VITE_USER_ID')
      console.warn('Falling back to local provider')
      setContactsProvider(new LocalMacOSProvider())
      return
    }
    
    setContactsProvider(new CloudProvider({
      apiUrl,
      userId,
      apiKey: import.meta.env.VITE_API_KEY,
    }))
    
    console.log('Contacts: using CloudProvider')
  } else {
    // Development: use local macOS Contacts
    setContactsProvider(new LocalMacOSProvider())
    console.log('Contacts: using LocalMacOSProvider')
  }
}
