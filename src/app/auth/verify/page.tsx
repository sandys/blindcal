import Link from 'next/link'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function VerifyPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-2xl">Check your email</CardTitle>
          <CardDescription>
            We&apos;ve sent you a verification link
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Click the link in your email to verify your account and get started.
            If you don&apos;t see the email, check your spam folder.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button asChild variant="outline">
            <Link href="/login">Back to login</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
