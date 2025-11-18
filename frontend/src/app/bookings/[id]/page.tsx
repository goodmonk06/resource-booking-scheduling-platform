'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { apiClient } from '@/lib/api'
import { CheckCircle, XCircle, Calendar, Clock, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'
import { format, parseISO } from 'date-fns'

interface Reservation {
  id: string
  startsAt: string
  endsAt: string
  status: string
  metaJson: any
  resource: {
    id: string
    name: string
    description: string
    group: {
      name: string
      type: string
    }
  }
}

export default function BookingConfirmationPage() {
  const params = useParams()
  const reservationId = params.id as string

  const [reservation, setReservation] = useState<Reservation | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    if (reservationId) {
      fetchReservation()
    }
  }, [reservationId])

  const fetchReservation = async () => {
    try {
      const response = await apiClient.getReservation(reservationId)
      setReservation(response.data)
    } catch (error) {
      toast.error('Failed to load booking')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this booking?')) {
      return
    }

    setCancelling(true)
    try {
      await apiClient.cancelReservation(reservationId, 'Cancelled by user')
      toast.success('Booking cancelled successfully')
      fetchReservation()
    } catch (error) {
      toast.error('Failed to cancel booking')
      console.error(error)
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading booking...</p>
        </div>
      </div>
    )
  }

  if (!reservation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Booking not found</p>
          <Link href="/resources" className="text-blue-600 mt-4 inline-block">
            Browse resources
          </Link>
        </div>
      </div>
    )
  }

  const statusColor = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    CONFIRMED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
    COMPLETED: 'bg-gray-100 text-gray-800',
  }[reservation.status]

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Booking Confirmation</h1>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Success Header */}
          {reservation.status !== 'CANCELLED' && (
            <div className="bg-green-50 p-6 text-center">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Booking Confirmed!
              </h2>
              <p className="text-gray-600">
                Your booking has been successfully created
              </p>
            </div>
          )}

          {reservation.status === 'CANCELLED' && (
            <div className="bg-red-50 p-6 text-center">
              <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Booking Cancelled
              </h2>
              <p className="text-gray-600">This booking has been cancelled</p>
            </div>
          )}

          {/* Booking Details */}
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {reservation.resource.name}
                </h3>
                <p className="text-gray-600">{reservation.resource.description}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor}`}>
                {reservation.status}
              </span>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-medium">
                    {format(parseISO(reservation.startsAt), 'EEEE, MMMM d, yyyy')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Time</p>
                  <p className="font-medium">
                    {format(parseISO(reservation.startsAt), 'h:mm a')} -{' '}
                    {format(parseISO(reservation.endsAt), 'h:mm a')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Resource Type</p>
                  <p className="font-medium capitalize">
                    {reservation.resource.group.type.toLowerCase()}
                  </p>
                </div>
              </div>
            </div>

            {reservation.metaJson && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="font-semibold mb-3">Contact Information</h4>
                <div className="space-y-2 text-sm">
                  {reservation.metaJson.customerName && (
                    <p>
                      <span className="text-gray-600">Name:</span>{' '}
                      <span className="font-medium">{reservation.metaJson.customerName}</span>
                    </p>
                  )}
                  {reservation.metaJson.customerEmail && (
                    <p>
                      <span className="text-gray-600">Email:</span>{' '}
                      <span className="font-medium">{reservation.metaJson.customerEmail}</span>
                    </p>
                  )}
                  {reservation.metaJson.notes && (
                    <p>
                      <span className="text-gray-600">Notes:</span>{' '}
                      <span className="font-medium">{reservation.metaJson.notes}</span>
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-gray-200 flex gap-4">
              <Link
                href="/resources"
                className="flex-1 text-center px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                Browse More Resources
              </Link>
              {reservation.status !== 'CANCELLED' && (
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {cancelling ? 'Cancelling...' : 'Cancel Booking'}
                </button>
              )}
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Booking Reference:</strong> {reservation.id}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Save this reference number for your records
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
