import Link from 'next/link'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function AuthCodeErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-2xl">Authentication Error</CardTitle>
          <CardDescription>
            There was a problem signing you in
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            The authentication link may have expired or is invalid.
            Please try signing in again.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center gap-4">
          <Button asChild variant="outline">
            <Link href="/login">Try again</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Create account</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
