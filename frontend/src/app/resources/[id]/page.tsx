'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { apiClient } from '@/lib/api'
import { Calendar as CalendarIcon, Users, MapPin, Clock, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import { format, addDays, startOfDay, endOfDay } from 'date-fns'

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
    tenant: {
      id: string
      name: string
    }
  }
  openingHours: Array<{
    id: string
    weekday: number
    startTime: string
    endTime: string
  }>
}

interface Reservation {
  id: string
  startsAt: string
  endsAt: string
  status: string
}

export default function ResourceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const resourceId = params.id as string

  const [resource, setResource] = useState<Resource | null>(null)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  useEffect(() => {
    if (resourceId) {
      fetchResource()
      fetchReservations()
    }
  }, [resourceId])

  const fetchResource = async () => {
    try {
      const response = await apiClient.getResource(resourceId)
      setResource(response.data)
    } catch (error) {
      toast.error('Failed to load resource')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const fetchReservations = async () => {
    try {
      const response = await apiClient.getReservations({
        resourceId,
        startDate: format(startOfDay(new Date()), "yyyy-MM-dd'T'HH:mm:ss"),
        endDate: format(endOfDay(addDays(new Date(), 30)), "yyyy-MM-dd'T'HH:mm:ss"),
      })
      setReservations(response.data)
    } catch (error) {
      console.error('Failed to load reservations', error)
    }
  }

  const getOpeningHoursForDay = (weekday: number) => {
    if (!resource) return []
    return resource.openingHours.filter((oh) => oh.weekday === weekday)
  }

  const handleBookNow = () => {
    router.push(`/resources/${resourceId}/book`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading resource...</p>
        </div>
      </div>
    )
  }

  if (!resource) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Resource not found</p>
          <Link href="/resources" className="text-blue-600 mt-4 inline-block">
            Back to resources
          </Link>
        </div>
      </div>
    )
  }

  const selectedDayOpeningHours = getOpeningHoursForDay(selectedDate.getDay())

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/resources"
              className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Resources
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Resource Details */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {resource.name}
                  </h1>
                  <p className="text-gray-600">{resource.description}</p>
                </div>
                <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full capitalize">
                  {resource.group.type.toLowerCase()}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                {resource.capacity && (
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Capacity</p>
                      <p className="font-semibold">{resource.capacity} people</p>
                    </div>
                  </div>
                )}
                {resource.metaJson?.floor && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Location</p>
                      <p className="font-semibold">Floor {resource.metaJson.floor}</p>
                    </div>
                  </div>
                )}
              </div>

              {resource.metaJson?.amenities && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3">Amenities</h3>
                  <div className="flex flex-wrap gap-2">
                    {resource.metaJson.amenities.map((amenity: string) => (
                      <span
                        key={amenity}
                        className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Opening Hours
                </h3>
                <div className="space-y-2">
                  {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(
                    (day, index) => {
                      const hours = getOpeningHoursForDay(index)
                      return (
                        <div key={day} className="flex justify-between py-2 border-b">
                          <span className="font-medium">{day}</span>
                          <span className="text-gray-600">
                            {hours.length > 0
                              ? hours.map((h) => `${h.startTime} - ${h.endTime}`).join(', ')
                              : 'Closed'}
                          </span>
                        </div>
                      )
                    }
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Booking Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
              <h2 className="text-xl font-semibold mb-4">Book This Resource</h2>

              <div className="mb-6">
                <Calendar
                  onChange={(value) => setSelectedDate(value as Date)}
                  value={selectedDate}
                  minDate={new Date()}
                  className="w-full border-0"
                />
              </div>

              <div className="mb-6">
                <h3 className="font-semibold mb-2">
                  Hours for {format(selectedDate, 'EEEE, MMM d')}
                </h3>
                {selectedDayOpeningHours.length > 0 ? (
                  <div className="space-y-1">
                    {selectedDayOpeningHours.map((oh) => (
                      <p key={oh.id} className="text-sm text-gray-600">
                        {oh.startTime} - {oh.endTime}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Closed on this day</p>
                )}
              </div>

              <button
                onClick={handleBookNow}
                disabled={selectedDayOpeningHours.length === 0}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Book Now
              </button>

              <p className="text-xs text-gray-500 mt-4 text-center">
                You'll be able to select specific time slots on the next page
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
