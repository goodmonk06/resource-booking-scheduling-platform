'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { apiClient } from '@/lib/api'
import { Users, MapPin, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

interface Resource {
  id: string
  name: string
  description: string
  capacity: number
  metaJson: any
  group: {
    id: string
    name: string
    type: string
  }
}

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedType, setSelectedType] = useState<string>('all')

  useEffect(() => {
    fetchResources()
  }, [])

  const fetchResources = async () => {
    try {
      const response = await apiClient.getResources()
      setResources(response.data)
    } catch (error) {
      toast.error('Failed to load resources')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const filteredResources =
    selectedType === 'all'
      ? resources
      : resources.filter((r) => r.group.type === selectedType)

  const resourceTypes = Array.from(
    new Set(resources.map((r) => r.group.type))
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">
              Available Resources
            </h1>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setSelectedType('all')}
            className={`px-4 py-2 rounded-lg font-medium ${
              selectedType === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            All
          </button>
          {resourceTypes.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-4 py-2 rounded-lg font-medium capitalize ${
                selectedType === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {type.toLowerCase()}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading resources...</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResources.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} />
            ))}
          </div>
        )}

        {!loading && filteredResources.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-600">No resources found</p>
          </div>
        )}
      </main>
    </div>
  )
}

function ResourceCard({ resource }: { resource: Resource }) {
  return (
    <Link
      href={`/resources/${resource.id}`}
      className="block bg-white rounded-lg shadow-md hover:shadow-lg transition p-6"
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-xl font-semibold text-gray-900">
          {resource.name}
        </h3>
        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full capitalize">
          {resource.group.type.toLowerCase()}
        </span>
      </div>

      <p className="text-gray-600 text-sm mb-4">{resource.description}</p>

      <div className="flex items-center gap-4 text-sm text-gray-500">
        {resource.capacity && (
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{resource.capacity} people</span>
          </div>
        )}
        {resource.metaJson?.floor && (
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            <span>Floor {resource.metaJson.floor}</span>
          </div>
        )}
      </div>

      {resource.metaJson?.amenities && (
        <div className="mt-4 flex flex-wrap gap-2">
          {resource.metaJson.amenities.slice(0, 3).map((amenity: string) => (
            <span
              key={amenity}
              className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
            >
              {amenity}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-200">
        <span className="text-blue-600 font-medium text-sm">
          View availability →
        </span>
      </div>
    </Link>
  )
}
