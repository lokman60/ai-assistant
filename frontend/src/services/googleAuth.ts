import { createContext, useContext } from 'react'

export const GoogleAuthAvailable = createContext(false)
export const useGoogleAuth = () => useContext(GoogleAuthAvailable)
