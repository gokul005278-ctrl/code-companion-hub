import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Copy, Code, Check, Loader2, ExternalLink, RefreshCw } from 'lucide-react';

interface EmbedSettings {
  id: string;
  embed_token: string;
  is_active: boolean;
  theme_color: string;
  button_text: string;
  success_message: string;
  form_fields: string[];
}

export function LeadCaptureWidget() {
  const [settings, setSettings] = useState<EmbedSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    is_active: true,
    theme_color: '#0066FF',
    button_text: 'Get Quote',
    success_message: 'Thank you! We will contact you soon.',
  });

  useEffect(() => {
    if (user) fetchSettings();
  }, [user]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('lead_embed_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSettings(data as EmbedSettings);
        setFormData({
          is_active: data.is_active ?? true,
          theme_color: data.theme_color || '#0066FF',
          button_text: data.button_text || 'Get Quote',
          success_message: data.success_message || 'Thank you! We will contact you soon.',
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateToken = () => {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const embedData = {
        owner_id: user.id,
        is_active: formData.is_active,
        theme_color: formData.theme_color,
        button_text: formData.button_text,
        success_message: formData.success_message,
      };

      if (settings) {
        const { error } = await supabase
          .from('lead_embed_settings')
          .update(embedData)
          .eq('id', settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('lead_embed_settings').insert({
          ...embedData,
          embed_token: generateToken(),
        });
        if (error) throw error;
      }

      toast.success('Settings saved successfully');
      fetchSettings();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const regenerateToken = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('lead_embed_settings')
        .update({ embed_token: generateToken() })
        .eq('id', settings.id);

      if (error) throw error;
      toast.success('Token regenerated');
      fetchSettings();
    } catch (error: any) {
      toast.error(error.message || 'Failed to regenerate token');
    } finally {
      setSaving(false);
    }
  };

  const getEmbedCode = (language: 'html' | 'react' | 'vue' | 'script') => {
    if (!settings) return '';

    const widgetUrl = `${window.location.origin}/api/lead-widget/${settings.embed_token}`;
    const formUrl = `${window.location.origin}/lead-form/${settings.embed_token}`;

    switch (language) {
      case 'html':
        return `<!-- Lead Capture Widget -->
<div id="lead-widget-container"></div>
<script>
(function() {
  var container = document.getElementById('lead-widget-container');
  var iframe = document.createElement('iframe');
  iframe.src = '${formUrl}';
  iframe.style.cssText = 'width:100%;min-height:450px;border:none;border-radius:12px;';
  iframe.setAttribute('loading', 'lazy');
  container.appendChild(iframe);
})();
</script>`;

      case 'react':
        return `// React Component
import { useEffect, useRef } from 'react';

function LeadCaptureWidget() {
  return (
    <iframe
      src="${formUrl}"
      style={{
        width: '100%',
        minHeight: '450px',
        border: 'none',
        borderRadius: '12px',
      }}
      loading="lazy"
    />
  );
}

export default LeadCaptureWidget;`;

      case 'vue':
        return `<!-- Vue Component -->
<template>
  <iframe
    src="${formUrl}"
    style="width: 100%; min-height: 450px; border: none; border-radius: 12px;"
    loading="lazy"
  />
</template>

<script>
export default {
  name: 'LeadCaptureWidget'
}
</script>`;

      case 'script':
        return `<!-- Add this script before </body> -->
<script src="${widgetUrl}" async></script>
<div data-lead-widget="${settings.embed_token}"></div>`;

      default:
        return '';
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Code copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Lead Capture Widget</h3>
        <p className="text-sm text-muted-foreground">
          Embed a lead capture form on your website to collect leads automatically.
        </p>
      </div>

      {/* Settings Form */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>Widget Status</Label>
            <p className="text-sm text-muted-foreground">Enable or disable the widget</p>
          </div>
          <Switch
            checked={formData.is_active}
            onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Theme Color</Label>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                value={formData.theme_color}
                onChange={(e) => setFormData({ ...formData, theme_color: e.target.value })}
                className="w-12 h-10 p-1 cursor-pointer"
              />
              <Input
                value={formData.theme_color}
                onChange={(e) => setFormData({ ...formData, theme_color: e.target.value })}
                placeholder="#0066FF"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Button Text</Label>
            <Input
              value={formData.button_text}
              onChange={(e) => setFormData({ ...formData, button_text: e.target.value })}
              placeholder="Get Quote"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Success Message</Label>
          <Textarea
            value={formData.success_message}
            onChange={(e) => setFormData({ ...formData, success_message: e.target.value })}
            placeholder="Thank you! We will contact you soon."
            rows={2}
          />
        </div>

        <Button onClick={handleSave} disabled={saving} className="btn-fade">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Save Settings
        </Button>
      </div>

      {/* Embed Codes */}
      {settings && (
        <div className="space-y-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Embed Code</h4>
            <Button
              size="sm"
              variant="outline"
              onClick={regenerateToken}
              disabled={saving}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Regenerate Token
            </Button>
          </div>

          <div className="space-y-4">
            {(['html', 'react', 'vue', 'script'] as const).map((lang) => (
              <div key={lang} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="capitalize">{lang === 'script' ? 'Script Tag' : lang}</Label>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(getEmbedCode(lang))}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 mr-1" />
                    ) : (
                      <Copy className="h-4 w-4 mr-1" />
                    )}
                    Copy
                  </Button>
                </div>
                <pre className="p-3 rounded-lg bg-muted text-xs overflow-x-auto max-h-32">
                  <code>{getEmbedCode(lang)}</code>
                </pre>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
              <Code className="h-4 w-4" />
              Integration Instructions
            </h5>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Copy your preferred embed code above</li>
              <li>Paste it into your website where you want the form to appear</li>
              <li>Leads will automatically sync to your Leads module</li>
              <li>Customize the theme color to match your brand</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
