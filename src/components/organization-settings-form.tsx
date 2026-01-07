'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface OrganizationSettings {
    organization_id: string;
    default_label_format: string;
    default_serving_size_g: number;
    default_servings_per_container: number;
    default_household_measure: string | null;
    show_dual_column: boolean;
    logo_url: string | null;
    primary_color: string;
    secondary_color: string;
    company_address: string | null;
    company_phone: string | null;
    company_website: string | null;
    general_disclaimer: string | null;
    footer_text: string | null;
    email_compliance_alerts: boolean;
    email_expiration_reminders: boolean;
    email_weekly_digest: boolean;
    email_team_activity: boolean;
    expiration_reminder_days: number;
}

interface MemberWithPermissions {
    id: string;
    full_name: string | null;
    role: string;
    created_at: string;
    user_permissions: {
        can_manage_ingredients: boolean;
        can_manage_recipes: boolean;
        can_manage_labels: boolean;
        can_manage_suppliers: boolean;
        can_export_data: boolean;
        can_import_data: boolean;
        can_manage_team: boolean;
        can_manage_settings: boolean;
        can_view_audit_log: boolean;
        can_delete_data: boolean;
    }[] | null;
}

interface AuditLogEntry {
    id: string;
    user_name: string | null;
    user_email: string | null;
    action: string;
    entity_type: string;
    entity_name: string | null;
    change_summary: string | null;
    created_at: string;
}

interface OrganizationSettingsFormProps {
    isAdmin: boolean;
    organizationId: string;
    organizationName: string;
}

export default function OrganizationSettingsForm({ isAdmin, organizationId, organizationName }: OrganizationSettingsFormProps) {
    const [activeTab, setActiveTab] = useState('general');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<OrganizationSettings | null>(null);
    const [members, setMembers] = useState<MemberWithPermissions[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
    const [auditLoading, setAuditLoading] = useState(false);

    // Invite member state
    const [showInviteDialog, setShowInviteDialog] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteName, setInviteName] = useState('');
    const [inviteRole, setInviteRole] = useState('member');
    const [inviting, setInviting] = useState(false);

    // Logo upload state
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [logoInputMode, setLogoInputMode] = useState<'url' | 'upload'>('url');
    const logoInputRef = useRef<HTMLInputElement>(null);

    const supabase = createClient();


    const fetchSettings = useCallback(async () => {
        const res = await fetch('/api/organization/settings');
        if (res.ok) {
            const data = await res.json();
            setSettings(data);
        }
        setLoading(false);
    }, []);

    const fetchMembers = useCallback(async () => {
        const res = await fetch('/api/organization/members');
        if (res.ok) {
            const data = await res.json();
            setMembers(data);
        }
    }, []);

    const fetchAuditLogs = useCallback(async () => {
        setAuditLoading(true);
        const res = await fetch('/api/organization/audit-log?limit=100');
        if (res.ok) {
            const data = await res.json();
            setAuditLogs(data.logs || []);
        }
        setAuditLoading(false);
    }, []);

    useEffect(() => {
        fetchSettings();
        fetchMembers();
    }, [fetchMembers, fetchSettings]);

    useEffect(() => {
        if (activeTab === 'audit') {
            fetchAuditLogs();
        }
    }, [activeTab, fetchAuditLogs]);

    const handleSaveSettings = async () => {
        if (!settings) return;
        setSaving(true);
        try {
            const res = await fetch('/api/organization/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            });
            if (res.ok) {
                toast.success('Settings saved successfully');
                // Dispatch event to trigger branding refresh across the app
                window.dispatchEvent(new CustomEvent('branding-updated'));
            } else {
                const error = await res.json();
                toast.error(error.error || 'Failed to save settings');
            }
        } catch {
            toast.error('Failed to save settings');
        }
        setSaving(false);
    };

    const handleLogoUpload = async (file: File) => {
        if (!isAdmin) return;

        setUploadingLogo(true);
        try {
            const formData = new FormData();
            formData.append('logo', file);

            const res = await fetch('/api/organization/logo', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (res.ok && data.logo_url) {
                updateSetting('logo_url', data.logo_url);
                toast.success('Logo uploaded successfully!');
                // Dispatch event to trigger branding refresh
                window.dispatchEvent(new CustomEvent('branding-updated'));
            } else {
                toast.error(data.error || 'Failed to upload logo');
            }
        } catch (err) {
            console.error('Logo upload error:', err);
            toast.error('Failed to upload logo');
        } finally {
            setUploadingLogo(false);
        }
    };

    const handleLogoDelete = async () => {
        if (!isAdmin || !settings?.logo_url) return;

        try {
            const res = await fetch('/api/organization/logo', {
                method: 'DELETE',
            });

            if (res.ok) {
                updateSetting('logo_url', null);
                toast.success('Logo removed');
                window.dispatchEvent(new CustomEvent('branding-updated'));
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to remove logo');
            }
        } catch {
            toast.error('Failed to remove logo');
        }
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleLogoUpload(file);
        }
        // Reset input so same file can be selected again
        if (logoInputRef.current) {
            logoInputRef.current.value = '';
        }
    };


    const handleUpdateMemberRole = async (memberId: string, newRole: string) => {
        try {
            const res = await fetch('/api/organization/members', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ memberId, role: newRole }),
            });
            if (res.ok) {
                toast.success('Role updated successfully');
                fetchMembers();
            } else {
                const error = await res.json();
                toast.error(error.error || 'Failed to update role');
            }
        } catch {
            toast.error('Failed to update role');
        }
    };

    const handleInviteMember = async () => {
        if (!inviteEmail) {
            toast.error('Email is required');
            return;
        }

        setInviting(true);
        try {
            const res = await fetch('/api/organization/members', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: inviteEmail,
                    full_name: inviteName || undefined,
                    role: inviteRole,
                }),
            });

            if (res.ok) {
                toast.success(`Successfully invited ${inviteEmail}`);
                setShowInviteDialog(false);
                setInviteEmail('');
                setInviteName('');
                setInviteRole('member');
                fetchMembers();
            } else {
                const error = await res.json();
                toast.error(error.error || 'Failed to invite member');
            }
        } catch {
            toast.error('Failed to invite member');
        }
        setInviting(false);
    };

    const handleRemoveMember = async (memberId: string, memberName: string) => {
        if (!confirm(`Are you sure you want to remove ${memberName} from the organization?`)) {
            return;
        }

        try {
            const res = await fetch(`/api/organization/members?memberId=${memberId}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                toast.success('Member removed successfully');
                fetchMembers();
            } else {
                const error = await res.json();
                toast.error(error.error || 'Failed to remove member');
            }
        } catch {
            toast.error('Failed to remove member');
        }
    };

    const handleExportData = async (dataType: string) => {
        try {
            const res = await fetch(`/api/organization/data?type=${dataType}`);
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `complianceos-${dataType}-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
                toast.success(`${dataType} data exported successfully`);
            }
        } catch {
            toast.error('Failed to export data');
        }
    };

    const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            const res = await fetch('/api/organization/data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...data, mergeMode: 'skip' }),
            });

            if (res.ok) {
                const result = await res.json();
                toast.success(`Import complete: ${JSON.stringify(result.results)}`);
            } else {
                const error = await res.json();
                toast.error(error.error || 'Failed to import data');
            }
        } catch {
            toast.error('Failed to parse import file');
        }

        event.target.value = '';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    const updateSetting = <K extends keyof OrganizationSettings>(key: K, value: OrganizationSettings[K]) => {
        if (settings) {
            setSettings({ ...settings, [key]: value });
        }
    };

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1 bg-muted/50 p-1 h-auto">
                <TabsTrigger value="general" className="text-xs sm:text-sm py-2">
                    <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    General
                </TabsTrigger>
                <TabsTrigger value="team" className="text-xs sm:text-sm py-2">
                    <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Team
                </TabsTrigger>
                <TabsTrigger value="labels" className="text-xs sm:text-sm py-2">
                    <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Labels
                </TabsTrigger>
                <TabsTrigger value="branding" className="text-xs sm:text-sm py-2">
                    <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                    Branding
                </TabsTrigger>
                <TabsTrigger value="notifications" className="text-xs sm:text-sm py-2">
                    <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    Notifications
                </TabsTrigger>
                <TabsTrigger value="data" className="text-xs sm:text-sm py-2">
                    <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                    </svg>
                    Data
                </TabsTrigger>
            </TabsList>

            {/* Audit Log Tab - separate row for better visibility */}
            <div className="flex justify-center">
                <TabsList className="bg-muted/50 p-1">
                    <TabsTrigger value="audit" className="text-xs sm:text-sm py-2 px-4">
                        <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Audit Log
                    </TabsTrigger>
                </TabsList>
            </div>

            {/* General Settings Tab */}
            <TabsContent value="general" className="space-y-4">
                <Card className="border shadow-card">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            Organization Information
                        </CardTitle>
                        <CardDescription>
                            Basic information about your organization
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Organization Name</Label>
                                <Input value={organizationName} disabled className="bg-muted" />
                                <p className="text-xs text-muted-foreground">Contact support to change organization name</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="company_website">Website</Label>
                                <Input
                                    id="company_website"
                                    placeholder="https://yourcompany.com"
                                    value={settings?.company_website || ''}
                                    onChange={(e) => updateSetting('company_website', e.target.value)}
                                    disabled={!isAdmin}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="company_phone">Phone Number</Label>
                                <Input
                                    id="company_phone"
                                    placeholder="+1 (555) 123-4567"
                                    value={settings?.company_phone || ''}
                                    onChange={(e) => updateSetting('company_phone', e.target.value)}
                                    disabled={!isAdmin}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="company_address">Address</Label>
                                <Input
                                    id="company_address"
                                    placeholder="123 Main St, City, State 12345"
                                    value={settings?.company_address || ''}
                                    onChange={(e) => updateSetting('company_address', e.target.value)}
                                    disabled={!isAdmin}
                                />
                            </div>
                        </div>
                        {isAdmin && (
                            <div className="flex justify-end pt-4">
                                <Button onClick={handleSaveSettings} disabled={saving}>
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>

            {/* Team & Permissions Tab */}
            <TabsContent value="team" className="space-y-4">
                {/* Invite Member Dialog */}
                {showInviteDialog && (
                    <Card className="border-2 border-primary/50 shadow-lg">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                </svg>
                                Invite New Team Member
                            </CardTitle>
                            <CardDescription>
                                Send an invitation to add someone to your organization
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="invite_email">Email Address *</Label>
                                    <Input
                                        id="invite_email"
                                        type="email"
                                        placeholder="colleague@company.com"
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="invite_name">Full Name (optional)</Label>
                                    <Input
                                        id="invite_name"
                                        placeholder="John Doe"
                                        value={inviteName}
                                        onChange={(e) => setInviteName(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Role</Label>
                                <Select value={inviteRole} onValueChange={setInviteRole}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="admin">Admin - Full access</SelectItem>
                                        <SelectItem value="member">Member - Create & edit</SelectItem>
                                        <SelectItem value="viewer">Viewer - Read only</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={handleInviteMember} disabled={inviting || !inviteEmail}>
                                    {inviting ? 'Sending...' : 'Send Invitation'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Card className="border shadow-card">
                    <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    Team Members ({members.length})
                                </CardTitle>
                                <CardDescription>
                                    Manage team roles and permissions
                                </CardDescription>
                            </div>
                            {isAdmin && !showInviteDialog && (
                                <Button size="sm" className="gap-1.5" onClick={() => setShowInviteDialog(true)}>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                    </svg>
                                    Invite Member
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {members.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <p>No team members found.</p>
                                    <p className="text-sm mt-1">Click &quot;Invite Member&quot; to add someone to your team.</p>
                                </div>
                            ) : (
                                members.map((member) => (
                                    <div key={member.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                                                <span className="text-sm font-medium text-white">
                                                    {member.full_name?.charAt(0)?.toUpperCase() || '?'}
                                                </span>
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-foreground">
                                                    {member.full_name || 'Unnamed User'}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {(member as MemberWithPermissions & { email?: string }).email || `Joined ${new Date(member.created_at).toLocaleDateString()}`}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {isAdmin ? (
                                                <>
                                                    <Select
                                                        value={member.role}
                                                        onValueChange={(value) => handleUpdateMemberRole(member.id, value)}
                                                    >
                                                        <SelectTrigger className="w-28">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="admin">Admin</SelectItem>
                                                            <SelectItem value="member">Member</SelectItem>
                                                            <SelectItem value="viewer">Viewer</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                                        onClick={() => handleRemoveMember(member.id, member.full_name || 'this user')}
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </Button>
                                                </>
                                            ) : (
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${member.role === 'admin'
                                                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                                    : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                                                    }`}>
                                                    {member.role}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Permissions Guide */}
                <Card className="border shadow-card">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Role Permissions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                                <div className="font-medium text-emerald-500 mb-2">Admin</div>
                                <ul className="text-xs text-muted-foreground space-y-1">
                                    <li>• Full access to all features</li>
                                    <li>• Manage team & settings</li>
                                    <li>• Import/Export data</li>
                                    <li>• View audit log</li>
                                    <li>• Delete data</li>
                                </ul>
                            </div>
                            <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                                <div className="font-medium text-blue-500 mb-2">Member</div>
                                <ul className="text-xs text-muted-foreground space-y-1">
                                    <li>• Create & edit items</li>
                                    <li>• Generate labels</li>
                                    <li>• Export own data</li>
                                    <li>• Cannot manage team</li>
                                    <li>• Cannot delete data</li>
                                </ul>
                            </div>
                            <div className="p-3 rounded-lg bg-slate-500/5 border border-slate-500/20">
                                <div className="font-medium text-slate-400 mb-2">Viewer</div>
                                <ul className="text-xs text-muted-foreground space-y-1">
                                    <li>• View all data</li>
                                    <li>• Download exports</li>
                                    <li>• Cannot create or edit</li>
                                    <li>• Cannot delete data</li>
                                    <li>• Read-only access</li>
                                </ul>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            {/* Label Defaults Tab */}
            <TabsContent value="labels" className="space-y-4">
                <Card className="border shadow-card">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Label Defaults
                        </CardTitle>
                        <CardDescription>
                            Default settings for new nutrition labels
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="default_label_format">Default Label Format</Label>
                                <Select
                                    value={settings?.default_label_format || 'fda_vertical'}
                                    onValueChange={(value) => updateSetting('default_label_format', value)}
                                    disabled={!isAdmin}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="fda_vertical">FDA Vertical (Standard)</SelectItem>
                                        <SelectItem value="tabular">Tabular</SelectItem>
                                        <SelectItem value="linear">Linear</SelectItem>
                                        <SelectItem value="simplified">Simplified</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="default_serving_size_g">Default Serving Size (g)</Label>
                                <Input
                                    id="default_serving_size_g"
                                    type="number"
                                    value={settings?.default_serving_size_g || 30}
                                    onChange={(e) => updateSetting('default_serving_size_g', parseFloat(e.target.value))}
                                    disabled={!isAdmin}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="default_servings_per_container">Default Servings Per Container</Label>
                                <Input
                                    id="default_servings_per_container"
                                    type="number"
                                    value={settings?.default_servings_per_container || 1}
                                    onChange={(e) => updateSetting('default_servings_per_container', parseInt(e.target.value))}
                                    disabled={!isAdmin}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="default_household_measure">Default Household Measure</Label>
                                <Input
                                    id="default_household_measure"
                                    placeholder="e.g., 1 cup, 2 tbsp"
                                    value={settings?.default_household_measure || ''}
                                    onChange={(e) => updateSetting('default_household_measure', e.target.value)}
                                    disabled={!isAdmin}
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
                            <div>
                                <div className="text-sm font-medium">Show Dual Column by Default</div>
                                <div className="text-xs text-muted-foreground">
                                    Display both &quot;As Packaged&quot; and &quot;As Prepared&quot; columns
                                </div>
                            </div>
                            <Switch
                                checked={settings?.show_dual_column || false}
                                onCheckedChange={(checked) => updateSetting('show_dual_column', checked)}
                                disabled={!isAdmin}
                            />
                        </div>
                        {isAdmin && (
                            <div className="flex justify-end pt-4">
                                <Button onClick={handleSaveSettings} disabled={saving}>
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>

            {/* Branding Tab */}
            <TabsContent value="branding" className="space-y-4">
                <Card className="border shadow-card card-tint-teal">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                            </svg>
                            Branding &amp; Appearance
                        </CardTitle>
                        <CardDescription>
                            Customize your organization&apos;s branding for the entire site. These colors and logo will be shown across all pages.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Logo Section */}
                        <div className="space-y-4">
                            <Label className="text-sm font-medium">Organization Logo</Label>

                            {/* Current Logo Preview */}
                            {settings?.logo_url && (
                                <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
                                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-background border border-border shadow-sm flex items-center justify-center">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={settings.logo_url}
                                            alt="Current logo"
                                            className="w-full h-full object-contain"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="%23999" stroke-width="1"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>';
                                            }}
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-foreground">Current Logo</p>
                                        <p className="text-xs text-muted-foreground truncate max-w-xs">{settings.logo_url}</p>
                                    </div>
                                    {isAdmin && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleLogoDelete}
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                        >
                                            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                            Remove
                                        </Button>
                                    )}
                                </div>
                            )}

                            {/* Logo Input Mode Toggle */}
                            {isAdmin && (
                                <div className="space-y-3">
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant={logoInputMode === 'upload' ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setLogoInputMode('upload')}
                                            className="flex-1"
                                        >
                                            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                            </svg>
                                            Upload File
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={logoInputMode === 'url' ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setLogoInputMode('url')}
                                            className="flex-1"
                                        >
                                            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                            </svg>
                                            Enter URL
                                        </Button>
                                    </div>

                                    {logoInputMode === 'upload' ? (
                                        <div
                                            className="relative border-2 border-dashed border-border/60 rounded-xl p-8 text-center hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer"
                                            onClick={() => logoInputRef.current?.click()}
                                        >
                                            <input
                                                ref={logoInputRef}
                                                type="file"
                                                accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp,image/gif"
                                                onChange={handleFileInputChange}
                                                className="hidden"
                                            />
                                            {uploadingLogo ? (
                                                <div className="flex flex-col items-center gap-2">
                                                    <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                                    <p className="text-sm text-muted-foreground">Uploading...</p>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
                                                        <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                    <p className="text-sm font-medium text-foreground">Click to upload logo</p>
                                                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG, SVG, WebP, or GIF (max 2MB)</p>
                                                </>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <Input
                                                id="logo_url"
                                                placeholder="https://yoursite.com/logo.png"
                                                value={settings?.logo_url || ''}
                                                onChange={(e) => updateSetting('logo_url', e.target.value)}
                                                disabled={!isAdmin}
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Enter a direct URL to your logo image
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer Text */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="footer_text">Footer Text</Label>
                                <Input
                                    id="footer_text"
                                    placeholder="© 2026 Your Company"
                                    value={settings?.footer_text || ''}
                                    onChange={(e) => updateSetting('footer_text', e.target.value)}
                                    disabled={!isAdmin}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="primary_color">Primary Color</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="primary_color"
                                        type="color"
                                        value={settings?.primary_color || '#10b981'}
                                        onChange={(e) => updateSetting('primary_color', e.target.value)}
                                        disabled={!isAdmin}
                                        className="w-16 h-10 p-1"
                                    />
                                    <Input
                                        value={settings?.primary_color || '#10b981'}
                                        onChange={(e) => updateSetting('primary_color', e.target.value)}
                                        disabled={!isAdmin}
                                        className="flex-1"
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Used for navigation highlights, buttons, and accents
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="secondary_color">Secondary Color</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="secondary_color"
                                        type="color"
                                        value={settings?.secondary_color || '#0d9488'}
                                        onChange={(e) => updateSetting('secondary_color', e.target.value)}
                                        disabled={!isAdmin}
                                        className="w-16 h-10 p-1"
                                    />
                                    <Input
                                        value={settings?.secondary_color || '#0d9488'}
                                        onChange={(e) => updateSetting('secondary_color', e.target.value)}
                                        disabled={!isAdmin}
                                        className="flex-1"
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Used for gradients and secondary accents
                                </p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="general_disclaimer">General Disclaimer</Label>
                            <Textarea
                                id="general_disclaimer"
                                placeholder="Enter a general disclaimer to appear on your labels and exports..."
                                value={settings?.general_disclaimer || ''}
                                onChange={(e) => updateSetting('general_disclaimer', e.target.value)}
                                disabled={!isAdmin}
                                rows={4}
                                className="resize-none"
                            />
                            <p className="text-xs text-muted-foreground">
                                This disclaimer will be included on exported label documents
                            </p>
                        </div>
                        {isAdmin && (
                            <div className="flex justify-end pt-4">
                                <Button onClick={handleSaveSettings} disabled={saving}>
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Live Preview Card */}
                <Card className="border shadow-card">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Live Preview
                        </CardTitle>
                        <CardDescription>
                            See how your branding will appear across the site
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Sidebar Preview */}
                            <div className="space-y-3">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sidebar Header</p>
                                <div className="rounded-lg border border-border bg-muted/30 p-4">
                                    <div className="flex items-center gap-2.5">
                                        {settings?.logo_url ? (
                                            <div className="w-7 h-7 rounded-md overflow-hidden relative shadow-soft border border-border/50">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={settings.logo_url}
                                                    alt="Logo preview"
                                                    className="w-full h-full object-contain"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                    }}
                                                />
                                            </div>
                                        ) : (
                                            <div
                                                className="w-7 h-7 rounded-md flex items-center justify-center shadow-soft"
                                                style={{
                                                    background: `linear-gradient(135deg, ${settings?.primary_color || '#10b981'}, ${settings?.secondary_color || '#0d9488'})`
                                                }}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                        )}
                                        <span className="text-sm font-semibold text-foreground">{organizationName}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Color Swatches */}
                            <div className="space-y-3">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Color Palette</p>
                                <div className="flex gap-3">
                                    <div className="flex-1 space-y-1.5">
                                        <div
                                            className="h-12 rounded-lg shadow-soft border border-border/50"
                                            style={{ backgroundColor: settings?.primary_color || '#10b981' }}
                                        />
                                        <p className="text-xs text-center text-muted-foreground">Primary</p>
                                    </div>
                                    <div className="flex-1 space-y-1.5">
                                        <div
                                            className="h-12 rounded-lg shadow-soft border border-border/50"
                                            style={{ backgroundColor: settings?.secondary_color || '#0d9488' }}
                                        />
                                        <p className="text-xs text-center text-muted-foreground">Secondary</p>
                                    </div>
                                    <div className="flex-1 space-y-1.5">
                                        <div
                                            className="h-12 rounded-lg shadow-soft border border-border/50"
                                            style={{
                                                background: `linear-gradient(135deg, ${settings?.primary_color || '#10b981'}, ${settings?.secondary_color || '#0d9488'})`
                                            }}
                                        />
                                        <p className="text-xs text-center text-muted-foreground">Gradient</p>
                                    </div>
                                </div>
                            </div>

                            {/* Sample UI Elements */}
                            <div className="space-y-3 md:col-span-2">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sample UI Elements</p>
                                <div className="flex flex-wrap gap-3 items-center">
                                    <button
                                        className="px-4 py-2 rounded-md text-white text-sm font-medium shadow-soft transition-colors"
                                        style={{ backgroundColor: settings?.primary_color || '#10b981' }}
                                    >
                                        Primary Button
                                    </button>
                                    <button
                                        className="px-4 py-2 rounded-md text-sm font-medium border transition-colors"
                                        style={{
                                            borderColor: settings?.primary_color || '#10b981',
                                            color: settings?.primary_color || '#10b981'
                                        }}
                                    >
                                        Outline Button
                                    </button>
                                    <span
                                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                                        style={{
                                            backgroundColor: `${settings?.primary_color || '#10b981'}20`,
                                            color: settings?.primary_color || '#10b981'
                                        }}
                                    >
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Active Badge
                                    </span>
                                    <div
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium"
                                        style={{
                                            background: `linear-gradient(135deg, ${settings?.primary_color || '#10b981'}, ${settings?.secondary_color || '#0d9488'})`
                                        }}
                                    >
                                        AB
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-4">
                <Card className="border shadow-card">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            Email Notifications
                        </CardTitle>
                        <CardDescription>
                            Configure email alerts and reminders
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
                                <div>
                                    <div className="text-sm font-medium">Compliance Alerts</div>
                                    <div className="text-xs text-muted-foreground">
                                        Get notified when labels have compliance issues
                                    </div>
                                </div>
                                <Switch
                                    checked={settings?.email_compliance_alerts ?? true}
                                    onCheckedChange={(checked) => updateSetting('email_compliance_alerts', checked)}
                                    disabled={!isAdmin}
                                />
                            </div>
                            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
                                <div>
                                    <div className="text-sm font-medium">Document Expiration Reminders</div>
                                    <div className="text-xs text-muted-foreground">
                                        Receive reminders before supplier documents expire
                                    </div>
                                </div>
                                <Switch
                                    checked={settings?.email_expiration_reminders ?? true}
                                    onCheckedChange={(checked) => updateSetting('email_expiration_reminders', checked)}
                                    disabled={!isAdmin}
                                />
                            </div>
                            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
                                <div>
                                    <div className="text-sm font-medium">Weekly Digest</div>
                                    <div className="text-xs text-muted-foreground">
                                        Receive a weekly summary of activity
                                    </div>
                                </div>
                                <Switch
                                    checked={settings?.email_weekly_digest ?? false}
                                    onCheckedChange={(checked) => updateSetting('email_weekly_digest', checked)}
                                    disabled={!isAdmin}
                                />
                            </div>
                            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
                                <div>
                                    <div className="text-sm font-medium">Team Activity</div>
                                    <div className="text-xs text-muted-foreground">
                                        Get notified when team members make changes
                                    </div>
                                </div>
                                <Switch
                                    checked={settings?.email_team_activity ?? false}
                                    onCheckedChange={(checked) => updateSetting('email_team_activity', checked)}
                                    disabled={!isAdmin}
                                />
                            </div>
                        </div>
                        <div className="pt-4 border-t">
                            <div className="space-y-2">
                                <Label htmlFor="expiration_reminder_days">Expiration Reminder Days</Label>
                                <div className="flex items-center gap-4">
                                    <Input
                                        id="expiration_reminder_days"
                                        type="number"
                                        min={1}
                                        max={90}
                                        value={settings?.expiration_reminder_days || 30}
                                        onChange={(e) => updateSetting('expiration_reminder_days', parseInt(e.target.value))}
                                        disabled={!isAdmin}
                                        className="w-24"
                                    />
                                    <span className="text-sm text-muted-foreground">days before expiration</span>
                                </div>
                            </div>
                        </div>
                        {isAdmin && (
                            <div className="flex justify-end pt-4">
                                <Button onClick={handleSaveSettings} disabled={saving}>
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>

            {/* Data Import/Export Tab */}
            <TabsContent value="data" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Export Section */}
                    <Card className="border shadow-card">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <svg className="w-5 h-5 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Export Data
                            </CardTitle>
                            <CardDescription>
                                Download your organization data as JSON
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => handleExportData('all')}>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                                </svg>
                                Export All Data
                            </Button>
                            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => handleExportData('ingredients')}>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                </svg>
                                Export Ingredients
                            </Button>
                            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => handleExportData('recipes')}>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Export Recipes
                            </Button>
                            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => handleExportData('labels')}>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                </svg>
                                Export Labels
                            </Button>
                            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => handleExportData('suppliers')}>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Export Suppliers
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Import Section */}
                    <Card className="border shadow-card">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                Import Data
                            </CardTitle>
                            <CardDescription>
                                Import data from a JSON backup file
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {isAdmin ? (
                                <>
                                    <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                                        <svg className="w-12 h-12 mx-auto text-muted-foreground mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                        <div className="text-sm font-medium mb-1">Upload JSON file</div>
                                        <div className="text-xs text-muted-foreground mb-4">
                                            Supports ComplianceOS export files
                                        </div>
                                        <label htmlFor="import-file">
                                            <input
                                                id="import-file"
                                                type="file"
                                                accept=".json"
                                                onChange={handleImportData}
                                                className="hidden"
                                            />
                                            <Button variant="outline" asChild>
                                                <span className="cursor-pointer">Select File</span>
                                            </Button>
                                        </label>
                                    </div>
                                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                        <div className="flex gap-2">
                                            <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                            <div className="text-xs text-amber-500">
                                                <strong>Note:</strong> Existing items with the same name will be skipped. This action cannot be undone.
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="p-8 text-center text-muted-foreground">
                                    <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    <div className="text-sm">Admin access required to import data</div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Genesis R&D Classic Import */}
                {isAdmin && (
                    <Card className="border shadow-card overflow-hidden">
                        <div className="h-1 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500"></div>
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
                                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                </div>
                                <div>
                                    <CardTitle className="text-lg font-semibold">
                                        Migrate from Genesis R&D Classic
                                    </CardTitle>
                                    <CardDescription>
                                        Import your ingredients and recipes from Genesis R&D Classic exports
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Moving away from Genesis R&D? Import your entire database including ingredients with full nutrition data, allergen flags, and recipes.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-center">
                                    <div className="text-lg font-bold text-foreground">✓</div>
                                    <div className="text-xs text-muted-foreground">Ingredients</div>
                                </div>
                                <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-center">
                                    <div className="text-lg font-bold text-foreground">✓</div>
                                    <div className="text-xs text-muted-foreground">Nutrition Data</div>
                                </div>
                                <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-center">
                                    <div className="text-lg font-bold text-foreground">✓</div>
                                    <div className="text-xs text-muted-foreground">Allergen Flags</div>
                                </div>
                            </div>
                            <Button
                                className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
                                onClick={() => window.location.href = '/organization/import/genesis'}
                            >
                                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                Start Genesis Import
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </TabsContent>

            {/* Audit Log Tab */}
            <TabsContent value="audit" className="space-y-4">
                <Card className="border shadow-card">
                    <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Activity Log
                                </CardTitle>
                                <CardDescription>
                                    Track all changes made in your organization
                                </CardDescription>
                            </div>
                            <Button variant="outline" size="sm" onClick={fetchAuditLogs} disabled={auditLoading}>
                                <svg className={`w-4 h-4 mr-1.5 ${auditLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Refresh
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {auditLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                        ) : auditLogs.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <div className="text-sm">No activity recorded yet</div>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[600px] overflow-y-auto">
                                {auditLogs.map((log) => (
                                    <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${log.action === 'create' ? 'bg-green-500/10 text-green-500' :
                                            log.action === 'update' ? 'bg-blue-500/10 text-blue-500' :
                                                log.action === 'delete' ? 'bg-red-500/10 text-red-500' :
                                                    log.action === 'export' ? 'bg-cyan-500/10 text-cyan-500' :
                                                        log.action === 'import' ? 'bg-purple-500/10 text-purple-500' :
                                                            'bg-slate-500/10 text-slate-400'
                                            }`}>
                                            {log.action === 'create' && (
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                </svg>
                                            )}
                                            {log.action === 'update' && (
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            )}
                                            {log.action === 'delete' && (
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            )}
                                            {log.action === 'export' && (
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                </svg>
                                            )}
                                            {log.action === 'import' && (
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                </svg>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-sm font-medium text-foreground">
                                                    {log.user_name || 'Unknown User'}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {log.action}d
                                                </span>
                                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${log.entity_type === 'ingredient' ? 'bg-orange-500/10 text-orange-500' :
                                                    log.entity_type === 'recipe' ? 'bg-green-500/10 text-green-500' :
                                                        log.entity_type === 'label' ? 'bg-blue-500/10 text-blue-500' :
                                                            log.entity_type === 'supplier' ? 'bg-purple-500/10 text-purple-500' :
                                                                log.entity_type === 'settings' ? 'bg-slate-500/10 text-slate-400' :
                                                                    log.entity_type === 'user' ? 'bg-cyan-500/10 text-cyan-500' :
                                                                        'bg-slate-500/10 text-slate-400'
                                                    }`}>
                                                    {log.entity_type}
                                                </span>
                                                {log.entity_name && (
                                                    <span className="text-sm text-muted-foreground truncate">
                                                        {log.entity_name}
                                                    </span>
                                                )}
                                            </div>
                                            {log.change_summary && (
                                                <div className="text-xs text-muted-foreground mt-0.5">
                                                    {log.change_summary}
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-xs text-muted-foreground shrink-0">
                                            {new Date(log.created_at).toLocaleString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    );
}
