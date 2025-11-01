import React, { useState } from 'react';
import { Send, Copy, Mail, MessageSquare, Calendar } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Select } from '../ui/Select';

interface StakeholderInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  stakeholders: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    department: string;
    status: string;
  }>;
  projectName: string;
  onSendInvites: (inviteData: any) => void;
}

export const StakeholderInviteModal: React.FC<StakeholderInviteModalProps> = ({
  isOpen,
  onClose,
  stakeholders,
  projectName,
  onSendInvites
}) => {
  const [inviteSettings, setInviteSettings] = useState({
    subject: `You're invited to participate in ${projectName} stakeholder interview`,
    message: `Hi {stakeholder_name},

You've been invited to participate in a stakeholder interview for the ${projectName} project.

This interview will help us understand your perspective and requirements to ensure the project meets everyone's needs.

The interview consists of targeted questions based on your role and should take approximately 15-20 minutes to complete.

Please click the link below to get started:
{interview_link}

If you have any questions, please don't hesitate to reach out.

Best regards,
{agency_name}`,
    reminderEnabled: true,
    reminderDays: 3,
    responseDeadline: '',
    allowedFormats: ['text', 'audio', 'video'] as string[]
  });

  const [selectedStakeholders, setSelectedStakeholders] = useState<string[]>(
    stakeholders.filter(s => s.status === 'pending').map(s => s.id)
  );

  const handleStakeholderToggle = (stakeholderId: string) => {
    setSelectedStakeholders(prev => 
      prev.includes(stakeholderId)
        ? prev.filter(id => id !== stakeholderId)
        : [...prev, stakeholderId]
    );
  };

  const handleSendInvites = () => {
    const inviteData = {
      stakeholder_ids: selectedStakeholders,
      settings: inviteSettings,
      project_name: projectName
    };
    
    onSendInvites(inviteData);
    onClose();
  };

  const generateInviteLink = (stakeholderId: string) => {
    return `https://speak.agency.com/interview/${stakeholderId}?token=abc123`;
  };

  const copyInviteLink = (stakeholderId: string) => {
    const link = generateInviteLink(stakeholderId);
    navigator.clipboard.writeText(link);
  };

  const selectedCount = selectedStakeholders.length;
  const pendingStakeholders = stakeholders.filter(s => s.status === 'pending');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Send Stakeholder Invites" size="lg">
      <div className="space-y-6">
        {/* Stakeholder Selection */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-gray-900">
              Select Stakeholders ({selectedCount} selected)
            </h4>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedStakeholders(pendingStakeholders.map(s => s.id))}
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedStakeholders([])}
              >
                Clear All
              </Button>
            </div>
          </div>

          <div className="space-y-3 max-h-60 overflow-y-auto">
            {stakeholders.map((stakeholder) => (
              <Card key={stakeholder.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedStakeholders.includes(stakeholder.id)}
                      onChange={() => handleStakeholderToggle(stakeholder.id)}
                      disabled={stakeholder.status !== 'pending'}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300"
                    />
                    <div>
                      <p className="font-medium text-gray-900">{stakeholder.name}</p>
                      <p className="text-sm text-gray-600">{stakeholder.role} • {stakeholder.department}</p>
                      <p className="text-sm text-gray-500">{stakeholder.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant={stakeholder.status === 'pending' ? 'warning' : 'success'}
                      size="sm"
                    >
                      {stakeholder.status}
                    </Badge>
                    {stakeholder.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Copy}
                        onClick={() => copyInviteLink(stakeholder.id)}
                      />
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Invite Settings */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-900">Invite Settings</h4>
          
          <Input
            label="Email Subject"
            value={inviteSettings.subject}
            onChange={(e) => setInviteSettings(prev => ({ ...prev, subject: e.target.value }))}
          />

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Email Message</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={8}
              value={inviteSettings.message}
              onChange={(e) => setInviteSettings(prev => ({ ...prev, message: e.target.value }))}
            />
            <p className="text-xs text-gray-500">
              Available variables: {'{stakeholder_name}'}, {'{interview_link}'}, {'{agency_name}'}, {'{project_name}'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Response Deadline"
              type="date"
              value={inviteSettings.responseDeadline}
              onChange={(e) => setInviteSettings(prev => ({ ...prev, responseDeadline: e.target.value }))}
            />
            <Select
              label="Reminder Frequency"
              value={inviteSettings.reminderDays.toString()}
              onChange={(e) => setInviteSettings(prev => ({ ...prev, reminderDays: parseInt(e.target.value) }))}
              options={[
                { value: '1', label: 'Daily' },
                { value: '3', label: 'Every 3 days' },
                { value: '7', label: 'Weekly' },
                { value: '0', label: 'No reminders' }
              ]}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Allowed Response Formats</label>
            <div className="flex space-x-4">
              {[
                { value: 'text', label: 'Text', icon: MessageSquare },
                { value: 'audio', label: 'Audio', icon: Mail },
                { value: 'video', label: 'Video', icon: Calendar }
              ].map(({ value, label, icon: Icon }) => (
                <label key={value} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={inviteSettings.allowedFormats.includes(value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setInviteSettings(prev => ({
                          ...prev,
                          allowedFormats: [...prev.allowedFormats, value]
                        }));
                      } else {
                        setInviteSettings(prev => ({
                          ...prev,
                          allowedFormats: prev.allowedFormats.filter(f => f !== value)
                        }));
                      }
                    }}
                    className="mr-2"
                  />
                  <Icon className="h-4 w-4 mr-1" />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Preview */}
        <Card className="bg-gray-50">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Email Preview</h4>
          <div className="space-y-2 text-sm">
            <p><strong>To:</strong> {selectedCount} stakeholder{selectedCount !== 1 ? 's' : ''}</p>
            <p><strong>Subject:</strong> {inviteSettings.subject}</p>
            <div className="bg-white p-3 rounded border text-xs">
              <pre className="whitespace-pre-wrap font-sans">
                {inviteSettings.message
                  .replace('{stakeholder_name}', '[Stakeholder Name]')
                  .replace('{interview_link}', '[Unique Interview Link]')
                  .replace('{agency_name}', '[Your Agency Name]')
                  .replace('{project_name}', projectName)
                }
              </pre>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSendInvites}
            disabled={selectedCount === 0}
            icon={Send}
          >
            Send {selectedCount} Invite{selectedCount !== 1 ? 's' : ''}
          </Button>
        </div>
      </div>
    </Modal>
  );
};