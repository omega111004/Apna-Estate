import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, TrendingUp, Users, Building, Eye, Heart } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { useAuth } from '../../contexts/AuthContext';
import { formatPriceINR } from '../../utils/currency';
const formatNumber = (n) => {
    if (n === undefined || n === null)
        return '-';
    if (n >= 1000)
        return `${(n / 1000).toFixed(1)}K`;
    return `${n}`;
};
const TinyBar = ({ value, max, label }) => {
    const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
    return (<div className="flex items-center space-x-3">
      <div className="flex-1 h-3 bg-gray-100 rounded">
        <div className="h-3 bg-primary-500 rounded" style={{ width: `${pct}%` }}/>
      </div>
      <div className="w-24 text-sm text-gray-600">{label}</div>
      <div className="w-12 text-sm font-semibold text-gray-900 text-right">{value}</div>
    </div>);
};
const AdminAnalyticsPage = () => {
    const { token } = useAuth();
    const RAW_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8888';
    const base = RAW_BASE.replace(/\/+$/, '');
    const apiBase = base.endsWith('/api') ? base : `${base}/api`;
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dashboard, setDashboard] = useState(null);
    const [summary, setSummary] = useState(null);
    const [typeDist, setTypeDist] = useState({});
    const [cityStats, setCityStats] = useState({});
    const [inquirySeries, setInquirySeries] = useState({});
    const [recentActivity, setRecentActivity] = useState([]);
    const [agentPerformance, setAgentPerformance] = useState([]);
    const [funnelData, setFunnelData] = useState({});
    const headers = useMemo(() => ({
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }), [token]);
    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                setError(null);
                const jsonOrThrow = async (res) => {
                    if (!res.ok) {
                        const text = await res.text();
                        throw new Error(`${res.status} ${res.statusText}${text ? `: ${text}` : ''}`);
                    }
                    return res.json();
                };
                const [sum, d, t, c, ts, ra, ap, fd] = await Promise.all([
                    fetch(`${apiBase}/analytics/summary`, { headers }).then(jsonOrThrow),
                    fetch(`${apiBase}/analytics/dashboard`, { headers }).then(jsonOrThrow),
                    fetch(`${apiBase}/analytics/property-types`, { headers }).then(jsonOrThrow),
                    fetch(`${apiBase}/analytics/properties-by-city`, { headers }).then(jsonOrThrow),
                    fetch(`${apiBase}/analytics/timeseries?metric=inquiries&rangeDays=30`, { headers }).then(jsonOrThrow),
                    fetch(`${apiBase}/analytics/recent-activity`, { headers }).then(jsonOrThrow),
                    fetch(`${apiBase}/analytics/agent-performance`, { headers }).then(jsonOrThrow),
                    fetch(`${apiBase}/analytics/funnel`, { headers }).then(jsonOrThrow),
                ]);
                setSummary(sum);
                setDashboard(d);
                setTypeDist(t);
                setCityStats(c);
                if (ts && ts.series)
                    setInquirySeries(ts.series);
                setRecentActivity(ra || []);
                setAgentPerformance(ap || []);
                setFunnelData(fd || {});
            }
            catch (e) {
                setError(e.message || 'Failed to load analytics');
            }
            finally {
                setLoading(false);
            }
        };
        load();
    }, [apiBase, headers]);
    // Live WebSocket summary updates
    useEffect(() => {
        let client = null;
        try {
            const baseNoApi = base.endsWith('/api') ? base.slice(0, -4) : base;
            const sockUrl = baseNoApi + '/ws';
            client = new Client({ webSocketFactory: () => new SockJS(sockUrl) });
            client.onConnect = () => {
                client.subscribe('/topic/analytics/summary', (msg) => {
                    try {
                        const data = JSON.parse(msg.body);
                        setSummary(data);
                    }
                    catch (err) {
                        console.error('Failed to parse summary update', err);
                    }
                });
                client.subscribe('/topic/analytics/recent', (msg) => {
                    try {
                        const data = JSON.parse(msg.body);
                        setRecentActivity(data || []);
                    }
                    catch (err) {
                        console.error('Failed to parse recent activity update', err);
                    }
                });
            };
            client.activate();
        }
        catch (err) {
            console.warn('WS summary setup failed', err);
        }
        return () => {
            try {
                client?.deactivate();
            }
            catch { }
        };
    }, [base]);
    const statCards = useMemo(() => {
        const cards = [];
        if (dashboard) {
            cards.push({ label: 'Total Users', value: dashboard.users.total, icon: Users });
            cards.push({ label: 'Active Properties', value: dashboard.properties.total, icon: Building });
            cards.push({ label: 'Avg Price', value: dashboard.pricing.average, icon: Eye, help: 'Average listing price' });
            cards.push({ label: 'Max Price', value: dashboard.pricing.maximum, icon: Heart, help: 'Highest listing price' });
        }
        if (summary) {
            cards.push({ label: 'Revenue (total)', value: Number(summary.revenue || 0), icon: TrendingUp });
            cards.push({ label: 'Inquiries', value: Number(summary.totalInquiries || 0), icon: BarChart3 });
            cards.push({ label: 'Negotiating', value: Number(summary.negotiating || 0), icon: BarChart3 });
            cards.push({ label: 'Purchased', value: Number(summary.purchased || 0), icon: BarChart3 });
        }
        return cards;
    }, [dashboard, summary]);
    const typeData = useMemo(() => Object.entries(typeDist).map(([k, v]) => ({ label: k, value: v })), [typeDist]);
    const topCities = useMemo(() => Object.entries(cityStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([k, v]) => ({ label: k, value: v })), [cityStats]);
    const inquiryDays = useMemo(() => Object.keys(inquirySeries || {}).sort(), [inquirySeries]);
    const inquiryValues = useMemo(() => inquiryDays.map(d => inquirySeries[d] || 0), [inquiryDays, inquirySeries]);
    const cityChartOption = useMemo(() => ({
        tooltip: {},
        xAxis: { type: 'category', data: Object.keys(cityStats) },
        yAxis: { type: 'value' },
        series: [{ type: 'bar', data: Object.values(cityStats), itemStyle: { color: '#3b82f6' } }]
    }), [cityStats]);
    const typeChartOption = useMemo(() => ({
        tooltip: { trigger: 'item' },
        series: [{
                type: 'pie', radius: '60%',
                data: Object.entries(typeDist).map(([name, value]) => ({ name, value })),
                emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)' } }
            }]
    }), [typeDist]);
    const inquiriesTsOption = useMemo(() => ({
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: inquiryDays },
        yAxis: { type: 'value' },
        series: [{ type: 'line', data: inquiryValues, smooth: true, areaStyle: {}, lineStyle: { width: 2 } }]
    }), [inquiryDays, inquiryValues]);
    const sankeyOption = useMemo(() => ({
        tooltip: { trigger: 'item', triggerOn: 'mousemove' },
        series: [{
                type: 'sankey',
                layout: 'none',
                emphasis: { focus: 'adjacency' },
                data: [
                    { name: 'Active' },
                    { name: 'Negotiating' },
                    { name: 'Agreed' },
                    { name: 'Purchased' }
                ],
                links: [
                    { source: 'Active', target: 'Negotiating', value: funnelData.negotiating || 0 },
                    { source: 'Negotiating', target: 'Agreed', value: funnelData.agreed || 0 },
                    { source: 'Agreed', target: 'Purchased', value: funnelData.purchased || 0 }
                ],
                itemStyle: { borderWidth: 1, borderColor: '#aaa' },
                lineStyle: { color: 'gradient', curveness: 0.5 }
            }]
    }), [funnelData]);
    return (<div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <BarChart3 className="w-7 h-7 mr-2 text-primary-600"/> Analytics Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Platform performance metrics and insights.</p>
          <div className="mt-4">
            <button onClick={async () => {
            try {
                const res = await fetch(`${apiBase}/analytics/export/pdf`, { headers });
                if (!res.ok)
                    throw new Error('Failed to export PDF');
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'analytics-summary.pdf';
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
            }
            catch (e) {
                console.error(e);
                alert('Failed to export PDF');
            }
        }} className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg shadow hover:bg-primary-700 transition">
              Export PDF
            </button>
          </div>
        </div>

        {error && (<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">{error}</div>)}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {loading && !dashboard && (<div className="col-span-4 text-center text-gray-500">Loading metrics...</div>)}
          {!loading && dashboard && statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (<div key={index} className="bg-white rounded-xl shadow-card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(Number(stat.value))}</p>
                  </div>
                  <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                    <Icon className="w-6 h-6 text-primary-600"/>
                  </div>
                </div>
                {stat.help && <div className="mt-3 text-xs text-gray-500">{stat.help}</div>}
              </div>);
        })}
        </div>

        {/* Distribution and Cities */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-card p-6">
            <h3 className="text-lg font-semibold mb-4">Property Type Distribution</h3>
            {Object.keys(typeDist).length === 0 ? (<div className="text-gray-500">No data</div>) : (<ReactECharts option={typeChartOption} style={{ height: 280 }}/>)}
          </div>

          <div className="bg-white rounded-xl shadow-card p-6">
            <h3 className="text-lg font-semibold mb-4">Top Cities by Listings</h3>
            {Object.keys(cityStats).length === 0 ? (<div className="text-gray-500">No data</div>) : (<ReactECharts option={cityChartOption} style={{ height: 280 }}/>)}
          </div>
        </div>

        {/* Activity + Inquiries */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-card p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
            {recentActivity.length === 0 ? (<div className="text-gray-500">No recent activity</div>) : (<div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {recentActivity.map((activity, i) => (<div key={i} className="flex items-start space-x-3 p-3 border-l-4 border-primary-200 bg-gray-50 rounded">
                    <div className="flex-1">
                      <div className="text-sm">
                        <span className="font-medium">Inquiry #{activity.id}</span>
                        {activity.property && (<span className="text-gray-600"> for {activity.property.title}</span>)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Status: <span className="capitalize">{activity.status?.toLowerCase()}</span>
                        {activity.updatedAt && (<span> • {new Date(activity.updatedAt).toLocaleDateString()}</span>)}
                      </div>
                    </div>
                  </div>))}
              </div>)}
          </div>

          <div className="bg-white rounded-xl shadow-card p-6">
            <h3 className="text-lg font-semibold mb-4">Inquiries (Last 30 days)</h3>
            {inquiryDays.length === 0 ? (<div className="text-gray-500">No data</div>) : (<ReactECharts option={inquiriesTsOption} style={{ height: 280 }}/>)}
          </div>
        </div>

        {/* Agent Performance Leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-card p-6">
            <h3 className="text-lg font-semibold mb-4">Top Performing Agents</h3>
            {agentPerformance.length === 0 ? (<div className="text-gray-500">No agent data</div>) : (<div className="space-y-3">
                {agentPerformance.slice(0, 5).map((agent, i) => (<div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium">{agent.agentName}</div>
                      <div className="text-sm text-gray-600">
                        {agent.totalInquiries} inquiries • {agent.purchased} purchased
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-600">
                        {formatPriceINR(Number(agent.revenue))}
                      </div>
                      <div className="text-sm text-gray-500">
                        {(agent.conversionRate * 100).toFixed(1)}% conversion
                      </div>
                    </div>
                  </div>))}
              </div>)}
          </div>

          <div className="bg-white rounded-xl shadow-card p-6">
            <h3 className="text-lg font-semibold mb-4">Inquiry Funnel</h3>
            {Object.keys(funnelData).length === 0 ? (<div className="text-gray-500">No funnel data</div>) : (<ReactECharts option={sankeyOption} style={{ height: 280 }}/>)}
          </div>
        </div>

      </div>
    </div>);
};
export default AdminAnalyticsPage;
