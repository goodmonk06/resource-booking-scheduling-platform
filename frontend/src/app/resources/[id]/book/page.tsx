'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { apiClient } from '@/lib/api'
import { ArrowLeft, Calendar as CalendarIcon, Clock, User } from 'lucide-react'
import toast from 'react-hot-toast'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import { format, addDays, parseISO } from 'date-fns'

interface AvailableSlot {
  startsAt: string
  endsAt: string
  durationMinutes: number
}

interface Resource {
  id: string
  name: string
  description: string
}

export default function BookResourcePage() {
  const params = useParams()
  const router = useRouter()
  const resourceId = params.id as string

  const [resource, setResource] = useState<Resource | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null)
  const [duration, setDuration] = useState<number>(60)
  const [loading, setLoading] = useState(false)
  const [bookingName, setBookingName] = useState('')
  const [bookingEmail, setBookingEmail] = useState('')
  const [bookingNotes, setBookingNotes] = useState('')

  useEffect(() => {
    if (resourceId) {
      fetchResource()
    }
  }, [resourceId])

  useEffect(() => {
    if (resourceId && selectedDate) {
      fetchAvailableSlots()
    }
  }, [resourceId, selectedDate, duration])

  const fetchResource = async () => {
    try {
      const response = await apiClient.getResource(resourceId)
      setResource(response.data)
    } catch (error) {
      toast.error('Failed to load resource')
      console.error(error)
    }
  }

  const fetchAvailableSlots = async () => {
    setLoading(true)
    try {
      const startDate = format(selectedDate, "yyyy-MM-dd'T'00:00:00")
      const endDate = format(selectedDate, "yyyy-MM-dd'T'23:59:59")

      const response = await apiClient.getAvailableSlots(
        resourceId,
        startDate,
        endDate,
        duration,
        30 // 30-minute intervals
      )
      setAvailableSlots(response.data)
    } catch (error) {
      toast.error('Failed to load available slots')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleBooking = async () => {
    if (!selectedSlot) {
      toast.error('Please select a time slot')
      return
    }

    if (!bookingName || !bookingEmail) {
      toast.error('Please provide your name and email')
      return
    }

    try {
      const response = await apiClient.createReservation({
        resourceId,
        startsAt: selectedSlot.startsAt,
        endsAt: selectedSlot.endsAt,
        metaJson: {
          customerName: bookingName,
          customerEmail: bookingEmail,
          notes: bookingNotes,
        },
      })

      toast.success('Booking created successfully!')
      router.push(`/bookings/${response.data.id}`)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create booking')
      console.error(error)
    }
  }

  const slotsForSelectedDate = availableSlots.filter((slot) => {
    const slotDate = parseISO(slot.startsAt)
    return format(slotDate, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link
              href={`/resources/${resourceId}`}
              className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Resource
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Book {resource?.name}
          </h1>
          <p className="text-gray-600">
            Select a date and time slot to make your booking
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left: Calendar and Duration */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" />
                Select Date
              </h2>
              <Calendar
                onChange={(value) => setSelectedDate(value as Date)}
                value={selectedDate}
                minDate={new Date()}
                maxDate={addDays(new Date(), 30)}
                className="w-full border-0"
              />
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Duration
              </h2>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
                <option value={180}>3 hours</option>
                <option value={240}>4 hours</option>
              </select>
            </div>
          </div>

          {/* Middle: Available Slots */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4">
                Available Times for {format(selectedDate, 'EEEE, MMM d')}
              </h2>

              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-2 text-sm text-gray-600">Loading slots...</p>
                </div>
              ) : slotsForSelectedDate.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {slotsForSelectedDate.map((slot, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedSlot(slot)}
                      className={`w-full text-left px-4 py-3 rounded-lg border-2 transition ${
                        selectedSlot === slot
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium">
                          {format(parseISO(slot.startsAt), 'h:mm a')} -{' '}
                          {format(parseISO(slot.endsAt), 'h:mm a')}
                        </span>
                        <span className="text-sm text-gray-500">
                          {slot.durationMinutes} min
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No available slots for this date and duration.</p>
                  <p className="text-sm mt-2">Try a different date or duration.</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Booking Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                Your Information
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={bookingName}
                    onChange={(e) => setBookingName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Your full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={bookingEmail}
                    onChange={(e) => setBookingEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (optional)
                  </label>
                  <textarea
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Any special requirements or notes..."
                  />
                </div>
              </div>

              {selectedSlot && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-sm text-gray-700 mb-2">
                    Booking Summary
                  </h3>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="text-gray-600">Resource:</span>{' '}
                      <span className="font-medium">{resource?.name}</span>
                    </p>
                    <p>
                      <span className="text-gray-600">Date:</span>{' '}
                      <span className="font-medium">
                        {format(parseISO(selectedSlot.startsAt), 'EEEE, MMM d, yyyy')}
                      </span>
                    </p>
                    <p>
                      <span className="text-gray-600">Time:</span>{' '}
                      <span className="font-medium">
                        {format(parseISO(selectedSlot.startsAt), 'h:mm a')} -{' '}
                        {format(parseISO(selectedSlot.endsAt), 'h:mm a')}
                      </span>
                    </p>
                  </div>
                </div>
              )}

              <button
                onClick={handleBooking}
                disabled={!selectedSlot || !bookingName || !bookingEmail}
                className="w-full mt-6 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Confirm Booking
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
