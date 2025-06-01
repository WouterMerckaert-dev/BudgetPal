import {useGetCurrentUser} from '@/api/auth'
import {User} from '@/models/firebaseTypes'

// Deze hook haalt de huidige gebruiker op uit de query cache en geeft deze terug.
// Deze hook is enkel bedoeld om kortere code te schrijven en is niet noodzakelijk.
const useUser = (): User | null => {
  const {data: user} = useGetCurrentUser()
  return user ?? null
}

export default useUser
