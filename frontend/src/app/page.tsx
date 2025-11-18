import Link from 'next/link'
import { Calendar, Users, Settings, BookOpen } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">
              Resource Booking Platform
            </h1>
            <div className="flex gap-4">
              <Link
                href="/resources"
                className="text-gray-600 hover:text-gray-900"
              >
                Browse Resources
              </Link>
              <Link
                href="/admin"
                className="text-gray-600 hover:text-gray-900"
              >
                Admin
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-gray-900 mb-4">
            Book Any Resource, Anytime
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            A flexible platform for managing bookings across rooms, desks, equipment, and more
          </p>
          <Link
            href="/resources"
            className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Browse Available Resources
          </Link>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <FeatureCard
            icon={<Calendar className="w-8 h-8" />}
            title="Easy Scheduling"
            description="View availability and book resources with our intuitive calendar interface"
          />
          <FeatureCard
            icon={<Users className="w-8 h-8" />}
            title="Multi-Tenant"
            description="Perfect for coworking spaces, clinics, and community facilities"
          />
          <FeatureCard
            icon={<Settings className="w-8 h-8" />}
            title="Flexible Policies"
            description="Customize booking rules, cancellation policies, and operating hours"
          />
          <FeatureCard
            icon={<BookOpen className="w-8 h-8" />}
            title="Resource Types"
            description="Manage rooms, desks, equipment, vehicles, and custom resources"
          />
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Use Cases
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <UseCaseCard
              title="Coworking Spaces"
              description="Manage hot desks, meeting rooms, and private offices. Enable members to book spaces hourly or daily."
            />
            <UseCaseCard
              title="Healthcare Clinics"
              description="Schedule patient appointments, manage consultation rooms, and optimize resource utilization."
            />
            <UseCaseCard
              title="Community Centers"
              description="Enable booking of facilities for events, classes, and activities with custom policies."
            />
          </div>
        </div>
      </main>

      <footer className="bg-white mt-16 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-600">
          <p>Resource Booking Platform - Built with NestJS, Prisma, and Next.js</p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="text-blue-600 mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  )
}

function UseCaseCard({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="border-l-4 border-blue-500 pl-4">
      <h4 className="text-lg font-semibold text-gray-900 mb-2">{title}</h4>
      <p className="text-gray-600">{description}</p>
    </div>
  )
}
