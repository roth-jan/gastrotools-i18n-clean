'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/contexts/LanguageContext'
import { Activity, AlertTriangle, CheckCircle, Clock, Users, TrendingUp, Zap } from 'lucide-react'

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded'
  timestamp: string
  uptime: number
  services: {
    database: string
    s3: string
    redis?: string
  }
  system: {
    memory: { used: number; total: number; percentage: number }
    environment: string
    version: string
  }
  metrics: {
    responseTime: number
  }
}

export default function MonitoringDashboard() {
  const { t } = useLanguage()
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const fetchHealthStatus = async () => {
    try {
      const response = await fetch('/api/health')
      const data = await response.json()
      setHealthStatus(data)
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Failed to fetch health status:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHealthStatus()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchHealthStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100'
      case 'degraded': return 'text-yellow-600 bg-yellow-100'
      case 'unhealthy': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-4 h-4" />
      case 'degraded': return <AlertTriangle className="w-4 h-4" />
      case 'unhealthy': return <AlertTriangle className="w-4 h-4" />
      default: return <Activity className="w-4 h-4" />
    }
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    
    if (days > 0) return `${days}d ${hours}h ${mins}m`
    if (hours > 0) return `${hours}h ${mins}m`
    return `${mins}m`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Activity className="w-8 h-8" />
                {t('monitoring.title')}
              </h1>
              <p className="text-gray-600 mt-2">
                {t('monitoring.subtitle')}
              </p>
            </div>
            <div className="text-right">
              <Button onClick={fetchHealthStatus} variant="outline">
                {t('monitoring.refresh')}
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                {t('monitoring.last_update')} {lastUpdated.toLocaleTimeString('de-DE')}
              </p>
            </div>
          </div>
        </div>

        {healthStatus && (
          <>
            {/* Overall Status */}
            <div className="mb-8">
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    {getStatusIcon(healthStatus.status)}
                    {t('monitoring.system_status')} 
                    <Badge className={getStatusColor(healthStatus.status)}>
                      {healthStatus.status.toUpperCase()}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">{t('monitoring.uptime')}</p>
                      <p className="text-2xl font-semibold">
                        {formatUptime(healthStatus.uptime)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">{t('monitoring.response_time')}</p>
                      <p className="text-2xl font-semibold">
                        {healthStatus.metrics.responseTime}ms
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">{t('monitoring.environment')}</p>
                      <p className="text-2xl font-semibold capitalize">
                        {healthStatus.system.environment}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">{t('monitoring.version')}</p>
                      <p className="text-2xl font-semibold">
                        {healthStatus.system.version}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Service Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Activity className="w-5 h-5" />
                    {t('monitoring.database')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Badge className={getStatusColor(healthStatus.services.database)}>
                      {healthStatus.services.database}
                    </Badge>
                    {healthStatus.services.database === 'healthy' && (
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Zap className="w-5 h-5" />
                    {t('monitoring.file_storage')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Badge className={getStatusColor(healthStatus.services.s3)}>
                      {healthStatus.services.s3}
                    </Badge>
                    {healthStatus.services.s3 === 'healthy' && (
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingUp className="w-5 h-5" />
                    {t('monitoring.system_resources')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{t('monitoring.memory_usage')}</span>
                      <span>{healthStatus.system.memory.percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${healthStatus.system.memory.percentage}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-600">
                      {healthStatus.system.memory.used}MB / {healthStatus.system.memory.total}MB
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>{t('monitoring.quick_actions')}</CardTitle>
                <CardDescription>
                  {t('monitoring.quick_actions_desc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Button variant="outline" className="flex flex-col items-center p-6 h-auto">
                    <Activity className="w-8 h-8 mb-2" />
                    <span>{t('monitoring.health_check')}</span>
                    <span className="text-xs text-gray-500">/api/health</span>
                  </Button>
                  
                  <Button variant="outline" className="flex flex-col items-center p-6 h-auto">
                    <Users className="w-8 h-8 mb-2" />
                    <span>{t('monitoring.lead_analytics')}</span>
                    <span className="text-xs text-gray-500">/admin/leads</span>
                  </Button>
                  
                  <Button variant="outline" className="flex flex-col items-center p-6 h-auto" disabled>
                    <TrendingUp className="w-8 h-8 mb-2" />
                    <span>{t('monitoring.sentry')}</span>
                    <span className="text-xs text-gray-500">{t('monitoring.external')}</span>
                  </Button>
                  
                  <Button variant="outline" className="flex flex-col items-center p-6 h-auto" disabled>
                    <Clock className="w-8 h-8 mb-2" />
                    <span>{t('monitoring.uptime_monitor')}</span>
                    <span className="text-xs text-gray-500">{t('monitoring.external')}</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Setup Instructions */}
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>{t('monitoring.setup_title')}</CardTitle>
                <CardDescription>
                  {t('monitoring.setup_desc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm">
                  <div>
                    <h4 className="font-semibold">{t('monitoring.sentry_setup')}</h4>
                    <p className="text-gray-600">
                      {t('monitoring.sentry_desc')}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold">{t('monitoring.uptime_setup')}</h4>
                    <p className="text-gray-600">
                      {t('monitoring.uptime_desc')}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold">{t('monitoring.log_setup')}</h4>
                    <p className="text-gray-600">
                      {t('monitoring.log_desc')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}