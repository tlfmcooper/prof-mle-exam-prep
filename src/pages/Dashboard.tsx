import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserStats } from '@/hooks/useAttempts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { data: stats, isLoading } = useUserStats(user?.id);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Professional ML Engineer Exam Prep</h1>
            <Button variant="outline" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">
            Welcome back{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ''}!
          </h2>
          <p className="text-muted-foreground">Ready to continue your exam preparation?</p>
        </div>

        {/* Stats Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Attempts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats?.total_attempts || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Overall Accuracy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {stats?.overall_accuracy ? `${stats.overall_accuracy.toFixed(1)}%` : '0%'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Study Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {stats?.total_study_time_hours ? `${stats.total_study_time_hours.toFixed(1)}h` : '0h'}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Practice Mode</CardTitle>
              <CardDescription>
                Answer questions at your own pace with instant feedback and explanations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/practice">
                <Button className="w-full">Start Practice</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timed Exam</CardTitle>
              <CardDescription>
                Simulate the real exam experience with a timer and no explanations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline" disabled>
                Coming Soon
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Data Notice */}
        <Card className="mt-8 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg">Getting Started</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>
              This application contains 15 sample questions from the Professional Machine Learning Engineer exam.
              Use the Practice mode to familiarize yourself with question types and get instant feedback.
            </p>
            <p className="mt-2 text-muted-foreground">
              Questions cover all 6 exam sections: Low-code AI, Data Collaboration, Model Development,
              Model Serving, MLOps & Automation, and Monitoring.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
