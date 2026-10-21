/**
 * Admin login. The screen itself lives in the shared kit so all three panels
 * look and behave identically; this file only pins the role.
 */
import { AuthScreen } from '@ui'

export function Login({ role }: { role: string }) {
  return <AuthScreen role={role} />
}
