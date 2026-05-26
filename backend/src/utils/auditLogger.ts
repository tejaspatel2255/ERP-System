import { supabase } from '../lib/supabase';

export class AuditLogger {
    static async log(
        userId: string | undefined,
        username: string,
        action: string,
        resource: string,
        resourceId?: string,
        details?: any,
        ipAddress?: string
    ) {
        try {
            await supabase.from('audit_logs').insert([
                {
                    user: userId || null,
                    username,
                    action,
                    resource,
                    resourceId: resourceId || null,
                    details: details || null,
                    ipAddress: ipAddress || null,
                },
            ]);
            console.log(`📝 [AUDIT LOG] ${username} performed ${action} on ${resource} (${resourceId || 'N/A'})`);
        } catch (err) {
            console.error('❌ Failed to create audit log:', err);
        }
    }
}
