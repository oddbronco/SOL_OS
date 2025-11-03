import React, { useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Upload, Palette, X, Eye, Image as ImageIcon } from 'lucide-react';

interface BrandingSettingsProps {
  projectId: string;
  currentLogoUrl?: string;
  currentPrimaryColor?: string;
  currentSecondaryColor?: string;
  currentTextColor?: string;
  onUpdate: () => void;
}

export const BrandingSettings: React.FC<BrandingSettingsProps> = ({
  projectId,
  currentLogoUrl,
  currentPrimaryColor = '#3B82F6',
  currentSecondaryColor = '#10B981',
  currentTextColor = '#FFFFFF',
  onUpdate
}) => {
  const [logoUrl, setLogoUrl] = useState(currentLogoUrl || '');
  const [primaryColor, setPrimaryColor] = useState(currentPrimaryColor);
  const [secondaryColor, setSecondaryColor] = useState(currentSecondaryColor);
  const [textColor, setTextColor] = useState(currentTextColor);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('File size must be less than 2MB');
      return;
    }

    try {
      setUploading(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${projectId}/${Date.now()}-logo.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('project-logos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('project-logos')
        .getPublicUrl(fileName);

      setLogoUrl(publicUrl);
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('Failed to upload logo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    setLogoUrl('');
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('projects')
        .update({
          brand_logo_url: logoUrl || null,
          brand_primary_color: primaryColor,
          brand_secondary_color: secondaryColor,
          brand_text_color: textColor
        })
        .eq('id', projectId);

      if (error) throw error;

      alert('Branding settings saved successfully!');
      onUpdate();
    } catch (error) {
      console.error('Error saving branding:', error);
      alert('Failed to save branding settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    setPrimaryColor('#3B82F6');
    setSecondaryColor('#10B981');
    setTextColor('#FFFFFF');
    setLogoUrl('');
  };

  return (
    <Card>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Branding & Customization
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Customize the stakeholder interview experience with your brand colors and logo
        </p>
      </div>

      <div className="space-y-6">
        {/* Logo Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Project Logo
          </label>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              {logoUrl ? (
                <div className="relative w-32 h-32 border-2 border-gray-200 rounded-lg overflow-hidden bg-white">
                  <img
                    src={logoUrl}
                    alt="Project logo"
                    className="w-full h-full object-contain"
                  />
                  <button
                    onClick={handleRemoveLogo}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:border-primary-500 hover:bg-primary-50 transition-colors"
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Upload className="h-8 w-8 text-gray-400 animate-pulse" />
                      <span className="text-xs text-gray-600 mt-2">Uploading...</span>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="h-8 w-8 text-gray-400" />
                      <span className="text-xs text-gray-600 mt-2">Upload Logo</span>
                    </>
                  )}
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600">
                Upload your company or project logo. This will be displayed at the top of the interview page for stakeholders.
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Recommended: PNG or SVG format, max 2MB, square or horizontal aspect ratio
              </p>
              {logoUrl && (
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="secondary"
                  size="sm"
                  icon={Upload}
                  className="mt-3"
                  disabled={uploading}
                >
                  Change Logo
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Color Pickers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Primary Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-12 h-12 rounded border border-gray-300 cursor-pointer"
              />
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#3B82F6"
                className="flex-1"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Used for buttons, links, and accents</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Secondary Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="w-12 h-12 rounded border border-gray-300 cursor-pointer"
              />
              <Input
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                placeholder="#10B981"
                className="flex-1"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Used for success states and highlights</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Text Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="w-12 h-12 rounded border border-gray-300 cursor-pointer"
              />
              <Input
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                placeholder="#FFFFFF"
                className="flex-1"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Used on colored backgrounds</p>
          </div>
        </div>

        {/* Preview */}
        <div>
          <Button
            onClick={() => setShowPreview(!showPreview)}
            variant="outline"
            size="sm"
            icon={Eye}
          >
            {showPreview ? 'Hide' : 'Show'} Preview
          </Button>
        </div>

        {showPreview && (
          <div className="border-2 border-gray-200 rounded-lg p-6" style={{ backgroundColor: '#f9fafb' }}>
            <p className="text-sm font-medium text-gray-700 mb-4">Stakeholder View Preview:</p>
            <div className="bg-white rounded-lg shadow-sm p-6 max-w-2xl">
              {logoUrl && (
                <div className="mb-6 flex justify-center">
                  <img src={logoUrl} alt="Logo preview" className="h-16 object-contain" />
                </div>
              )}
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Your Interview</h2>
                <p className="text-gray-600">This is how stakeholders will see your branded interview page</p>
              </div>
              <div className="space-y-3">
                <button
                  style={{
                    backgroundColor: primaryColor,
                    color: textColor
                  }}
                  className="w-full py-3 rounded-lg font-medium"
                >
                  Primary Button Example
                </button>
                <button
                  style={{
                    backgroundColor: secondaryColor,
                    color: textColor
                  }}
                  className="w-full py-3 rounded-lg font-medium"
                >
                  Secondary Button Example
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <Button
            onClick={resetToDefaults}
            variant="secondary"
            size="sm"
          >
            Reset to Defaults
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            size="sm"
          >
            {saving ? 'Saving...' : 'Save Branding Settings'}
          </Button>
        </div>
      </div>
    </Card>
  );
};
