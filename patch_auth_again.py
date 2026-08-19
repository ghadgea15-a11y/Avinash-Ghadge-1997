import re

with open('src/services/firebaseAuthService.ts', 'r') as f:
    content = f.read()

content = content.replace("SecurityAuditService.logEvent(\n          session,\n", "SecurityAuditService.logEvent(\n          session.companyId,\n          session.userId,\n          session.role,\n          session.employeeId,\n")

# For failed auth in password mode:
password_catch = r"""      } catch (err: unknown) {
        const firebaseErr = err as { code\?: string; message\?: string };
        if (
          firebaseErr.code === 'auth/wrong-password' ||
          firebaseErr.code === 'auth/user-not-found' ||
          firebaseErr.code === 'auth/invalid-credential'
        ) {
          SecurityAuditService.logEvent(companyId, cleanInput, 'UNKNOWN', undefined, 'LOGIN_FAILED', 'authentication', cleanInput, false, 'MEDIUM', 'Invalid credentials').catch(() => {});
          throw new Error('Invalid email or password. Please verify your login details.');
        }"""
content = re.sub(r"      \} catch \(err: unknown\) \{\n        const firebaseErr = err as \{ code\?: string; message\?: string \};\n        if \(\n          firebaseErr.code === 'auth/wrong-password' \|\|\n          firebaseErr.code === 'auth/user-not-found' \|\|\n          firebaseErr.code === 'auth/invalid-credential'\n        \) \{\n          throw new Error\('Invalid email or password\. Please verify your login details\.'\);\n        \}", password_catch, content)

# For failed auth in custom token mode:
pin_catch = r"""    } catch (err: any) {
      console.error('\[FirebaseAuthService\] PIN auth error:', err);
      SecurityAuditService.logEvent(companyId, cleanInput, 'UNKNOWN', cleanInput, 'LOGIN_FAILED', 'authentication', cleanInput, false, 'MEDIUM', 'Invalid PIN credentials').catch(() => {});
      if (err instanceof Error) {
        throw err;
      }
      throw new Error('Invalid credentials or PIN entered. Please check your details and try again.');
    }
"""
content = re.sub(r"    \} catch \(err: any\) \{\n      console\.error\('\[FirebaseAuthService\] PIN auth error:', err\);\n      if \(err instanceof Error\) \{\n        throw err;\n      \}\n      throw new Error\('Invalid credentials or PIN entered\. Please check your details and try again\.'\);\n    \}\n    throw new Error\('Invalid credentials or PIN entered\. Please check your details and try again\.'\);", pin_catch + "    throw new Error('Invalid credentials or PIN entered. Please check your details and try again.');", content)

with open('src/services/firebaseAuthService.ts', 'w') as f:
    f.write(content)
