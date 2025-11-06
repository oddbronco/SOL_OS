import React, { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import type { Stakeholder } from '../../hooks/useSupabaseData'

interface EditStakeholderModalProps {
  isOpen: boolean
  onClose: () => void
  stakeholder: Stakeholder | null
  onSave: (stakeholderId: string, updates: Partial<Stakeholder>) => Promise<void>
  loading?: boolean
}

export const EditStakeholderModal: React.FC<EditStakeholderModalProps> = ({
  isOpen,
  onClose,
  stakeholder,
  onSave,
  loading = false
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    department: '',
    interview_password: '',
    status: 'pending' as Stakeholder['status'],
    mentioned_context: ''
  })

  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (stakeholder) {
      setFormData({
        name: stakeholder.name,
        email: stakeholder.email,
        role: stakeholder.role,
        department: stakeholder.department,
        interview_password: stakeholder.interview_password || '',
        status: stakeholder.status,
        mentioned_context: stakeholder.mentioned_context || ''
      })
    }
  }, [stakeholder])

  const handleSave = async () => {
    if (!stakeholder) return

    setSaving(true)
    try {
      await onSave(stakeholder.id, formData)
      onClose()
    } catch (error) {
      console.error('Failed to save stakeholder:', error)
    } finally {
      setSaving(false)
    }
  }

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'invited', label: 'Invited' },
    { value: 'responded', label: 'Responded' },
    { value: 'completed', label: 'Completed' }
  ]

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Stakeholder"
      size="lg"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="John Smith"
            required
          />
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="john@company.com"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Role"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            placeholder="Product Manager"
            required
          />
          <Input
            label="Department"
            value={formData.department}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            placeholder="Product"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+1 (555) 123-4567"
          />
          <Input
            label="Seniority"
            value={formData.seniority}
            onChange={(e) => setFormData({ ...formData, seniority: e.target.value })}
            placeholder="Senior, Mid, Junior"
          />
          <Input
            label="Experience (Years)"
            type="number"
            value={formData.experience_years}
            onChange={(e) => setFormData({ ...formData, experience_years: parseInt(e.target.value) || 0 })}
            placeholder="5"
          />
        </div>

        <Input
          label="Interview Password"
          value={formData.interview_password}
          onChange={(e) => setFormData({ ...formData, interview_password: e.target.value })}
          placeholder="Auto-generated 7-character code"
          helperText="Leave blank to auto-generate a new password"
        />

        <Select
          label="Status"
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value as Stakeholder['status'] })}
          options={statusOptions}
        />

        {formData.mentioned_context && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Context from Transcript
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              value={formData.mentioned_context}
              onChange={(e) => setFormData({ ...formData, mentioned_context: e.target.value })}
              placeholder="Context from where this stakeholder was mentioned..."
            />
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            loading={saving}
            disabled={!formData.name || !formData.email || !formData.role}
          >
            Save Changes
          </Button>
        </div>
      </div>
    </Modal>
  )
}