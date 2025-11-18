'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { apiClient } from '@/lib/api'
import { Plus, Settings, Calendar, Users, Building2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface Resource {
  id: string
  name: string
  description: string
  capacity: number
  isActive: boolean
  group: {
    name: string
    type: string
  }
}

interface ResourceGroup {
  id: string
  name: string
  type: string
  _count: {
    resources: number
  }
}

export default function AdminPage() {
  const [resources, setResources] = useState<Resource[]>([])
  const [groups, setGroups] = useState<ResourceGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'resources' | 'groups' | 'bookings'>('resources')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [resourcesRes, groupsRes] = await Promise.all([
        apiClient.getResources(),
        apiClient.getResourceGroups(),
      ])
      setResources(resourcesRes.data)
      setGroups(groupsRes.data)
    } catch (error) {
      toast.error('Failed to load data')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <Link
              href="/"
              className="text-gray-600 hover:text-gray-900"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<Building2 className="w-8 h-8" />}
            title="Total Resources"
            value={resources.length}
            color="blue"
          />
          <StatCard
            icon={<Users className="w-8 h-8" />}
            title="Resource Groups"
            value={groups.length}
            color="green"
          />
          <StatCard
            icon={<Calendar className="w-8 h-8" />}
            title="Active Resources"
            value={resources.filter((r) => r.isActive).length}
            color="purple"
          />
          <StatCard
            icon={<Settings className="w-8 h-8" />}
            title="Inactive"
            value={resources.filter((r) => !r.isActive).length}
            color="gray"
          />
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('resources')}
                className={`px-6 py-4 font-medium border-b-2 ${
                  activeTab === 'resources'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Resources
              </button>
              <button
                onClick={() => setActiveTab('groups')}
                className={`px-6 py-4 font-medium border-b-2 ${
                  activeTab === 'groups'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Resource Groups
              </button>
              <button
                onClick={() => setActiveTab('bookings')}
                className={`px-6 py-4 font-medium border-b-2 ${
                  activeTab === 'bookings'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Bookings
              </button>
            </nav>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-600">Loading...</p>
              </div>
            ) : (
              <>
                {activeTab === 'resources' && (
                  <ResourcesTab resources={resources} />
                )}
                {activeTab === 'groups' && <GroupsTab groups={groups} />}
                {activeTab === 'bookings' && <BookingsTab />}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

function StatCard({
  icon,
  title,
  value,
  color,
}: {
  icon: React.ReactNode
  title: string
  value: number
  color: string
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    gray: 'bg-gray-50 text-gray-600',
  }[color]

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className={`${colorClasses} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <h3 className="text-gray-600 text-sm font-medium">{title}</h3>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  )
}

function ResourcesTab({ resources }: { resources: Resource[] }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Manage Resources</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
          <Plus className="w-4 h-4" />
          Add Resource
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Group</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Capacity</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {resources.map((resource) => (
              <tr key={resource.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4">
                  <div>
                    <p className="font-medium text-gray-900">{resource.name}</p>
                    <p className="text-sm text-gray-500">{resource.description}</p>
                  </div>
                </td>
                <td className="py-3 px-4">{resource.group.name}</td>
                <td className="py-3 px-4 capitalize">{resource.group.type.toLowerCase()}</td>
                <td className="py-3 px-4">{resource.capacity || 'N/A'}</td>
                <td className="py-3 px-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      resource.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {resource.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <Link
                    href={`/resources/${resource.id}`}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function GroupsTab({ groups }: { groups: ResourceGroup[] }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Resource Groups</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
          <Plus className="w-4 h-4" />
          Add Group
        </button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((group) => (
          <div key={group.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition">
            <h3 className="font-semibold text-gray-900 mb-1">{group.name}</h3>
            <p className="text-sm text-gray-600 capitalize mb-3">{group.type.toLowerCase()}</p>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">
                {group._count.resources} resources
              </span>
              <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                Manage
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function BookingsTab() {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Recent Bookings</h2>
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Booking management interface</p>
        <p className="text-sm text-gray-500 mt-2">
          This would show all reservations with filtering and management options
        </p>
      </div>
    </div>
  )
}
