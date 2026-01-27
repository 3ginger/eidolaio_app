import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { Link, useNavigate } from 'react-router-dom'
import { get, patch, del } from '../utils/api'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import EmptyState from '../components/ui/EmptyState'
import Alert from '../components/ui/Alert'
import TabGroup from '../components/ui/TabGroup'
import {
  Shield,
  AlertTriangle,
  Users,
  Image,
  Flag,
  Check,
  X,
  Trash2,
  ExternalLink,
  ChevronLeft
} from 'lucide-react'

interface Report {
  id: number
  postId: number
  reporterId: number
  reason: string
  description?: string
  status: string
  createdAt: string
  reporter: { username: string }
  post: {
    id: number
    imageUrl: string
    title?: string
    userId: number
    username: string
  }
}

interface AdminStats {
  totalPosts: number
  totalUsers: number
  pendingReports: number
  flaggedPosts: number
}

export default function AdminPage() {
  const { getToken } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'pending' | 'all'>('pending')
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  useEffect(() => {
    fetchData()
  }, [filter])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const token = await getToken()

      // Fetch stats and reports in parallel
      const [statsData, reportsData] = await Promise.all([
        get<AdminStats>('/admin/stats', undefined, token),
        get<{ reports: Report[] }>('/admin/reports', { status: filter === 'pending' ? 'pending' : undefined }, token)
      ])

      setStats(statsData)
      setReports(reportsData.reports)
    } catch (err) {
      if (err instanceof Error && err.message.includes('Admin access required')) {
        navigate('/feed')
        return
      }
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDismiss = async (reportId: number) => {
    try {
      setActionLoading(reportId)
      const token = await getToken()
      await patch(`/admin/reports/${reportId}`, { status: 'dismissed' }, token)
      setReports(prev => prev.filter(r => r.id !== reportId))
      if (stats) {
        setStats({ ...stats, pendingReports: stats.pendingReports - 1 })
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to dismiss report')
    } finally {
      setActionLoading(null)
    }
  }

  const handleSustain = async (reportId: number) => {
    try {
      setActionLoading(reportId)
      const token = await getToken()
      await patch(`/admin/reports/${reportId}`, { status: 'sustained' }, token)
      setReports(prev => prev.filter(r => r.id !== reportId))
      if (stats) {
        setStats({
          ...stats,
          pendingReports: stats.pendingReports - 1,
          flaggedPosts: stats.flaggedPosts + 1
        })
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to sustain report')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeletePost = async (postId: number, reportId: number) => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return
    }
    try {
      setActionLoading(reportId)
      const token = await getToken()
      await del(`/admin/posts/${postId}`, token)
      setReports(prev => prev.filter(r => r.postId !== postId))
      if (stats) {
        setStats({
          ...stats,
          totalPosts: stats.totalPosts - 1,
          pendingReports: Math.max(0, stats.pendingReports - 1)
        })
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete post')
    } finally {
      setActionLoading(null)
    }
  }

  if (isLoading) {
    return <LoadingSpinner fullHeight />
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Alert type="error" message={error} />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/feed" className="p-1 hover:bg-gray-100 rounded-full">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-eidola-orange" />
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        </div>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Image className="w-4 h-4" />
              <span className="text-sm">Total Posts</span>
            </div>
            <div className="text-2xl font-bold">{stats.totalPosts}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Users className="w-4 h-4" />
              <span className="text-sm">Total Users</span>
            </div>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center gap-2 text-orange-500 mb-1">
              <Flag className="w-4 h-4" />
              <span className="text-sm">Pending Reports</span>
            </div>
            <div className="text-2xl font-bold text-orange-500">{stats.pendingReports}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center gap-2 text-red-500 mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">Flagged Posts</span>
            </div>
            <div className="text-2xl font-bold text-red-500">{stats.flaggedPosts}</div>
          </div>
        </div>
      )}

      {/* Reports Section */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Reports</h2>
          <TabGroup
            tabs={[
              { value: 'pending' as const, label: 'Pending' },
              { value: 'all' as const, label: 'All' },
            ]}
            value={filter}
            onChange={setFilter}
          />
        </div>

        {reports.length === 0 ? (
          <EmptyState
            title={`No ${filter === 'pending' ? 'pending ' : ''}reports found`}
            className="py-8"
          />
        ) : (
          <div className="divide-y">
            {reports.map(report => (
              <div key={report.id} className="p-4">
                <div className="flex gap-4">
                  {/* Post thumbnail */}
                  <Link to={`/post/${report.postId}`} className="flex-shrink-0">
                    <img
                      src={report.post.imageUrl}
                      alt="Reported post"
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                  </Link>

                  {/* Report details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          report.reason === 'nsfw' ? 'bg-red-100 text-red-700' :
                          report.reason === 'spam' ? 'bg-yellow-100 text-yellow-700' :
                          report.reason === 'harassment' ? 'bg-purple-100 text-purple-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {report.reason}
                        </span>
                        <div className="text-sm text-gray-500 mt-1">
                          Reported by @{report.reporter.username}
                        </div>
                        <div className="text-sm text-gray-500">
                          Post by @{report.post.username}
                        </div>
                      </div>
                      <Link
                        to={`/post/${report.postId}`}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <ExternalLink className="w-4 h-4 text-gray-400" />
                      </Link>
                    </div>

                    {report.description && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                        {report.description}
                      </p>
                    )}

                    <div className="text-xs text-gray-400 mt-2">
                      {new Date(report.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {report.status === 'pending' && (
                  <div className="flex gap-2 mt-3 justify-end">
                    <button
                      onClick={() => handleDismiss(report.id)}
                      disabled={actionLoading === report.id}
                      className="flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                      Dismiss
                    </button>
                    <button
                      onClick={() => handleSustain(report.id)}
                      disabled={actionLoading === report.id}
                      className="flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-lg text-sm hover:bg-orange-200 disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      Flag Post
                    </button>
                    <button
                      onClick={() => handleDeletePost(report.postId, report.id)}
                      disabled={actionLoading === report.id}
                      className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200 disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                )}

                {report.status !== 'pending' && (
                  <div className="mt-3 text-right">
                    <span className={`inline-block px-2 py-1 rounded text-xs ${
                      report.status === 'dismissed' ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'
                    }`}>
                      {report.status}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
