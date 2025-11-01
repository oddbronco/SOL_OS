import React, { useState } from 'react';
import { Plus, Search, Building2, Mail, Phone, Globe, Edit, Trash2 } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { useSupabaseData } from '../hooks/useSupabaseData';

export const Clients: React.FC = () => {
  const { clients, addClient, updateClient, deleteClient } = useSupabaseData();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newClient, setNewClient] = useState({
    name: '',
    industry: '',
    email: '',
    phone: '',
    website: '',
    contact_person: ''
  });

  const handleAddClient = () => {
    const clientPromise = addClient({
      ...newClient,
      status: 'active' as const
    });
    
    clientPromise.then(() => {
      // Client added successfully, form will be reset below
    });
    
    setNewClient({
      name: '',
      industry: '',
      email: '',
      phone: '',
      website: '',
      contact_person: ''
    });
    setShowAddModal(false);
  };

  const handleEditClient = (client: any) => {
    setEditingClient(client);
    setShowEditModal(true);
  };

  const handleUpdateClient = () => {
    if (!editingClient) return;
    
    updateClient(editingClient.id, {
      name: editingClient.name,
      industry: editingClient.industry,
      email: editingClient.email,
      phone: editingClient.phone,
      website: editingClient.website,
      contact_person: editingClient.contact_person
    });
    
    setEditingClient(null);
    setShowEditModal(false);
  };

  const handleDeleteClient = (clientId: string) => {
    if (confirm('Are you sure you want to delete this client? This will also delete all associated projects.')) {
      deleteClient(clientId);
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.industry.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.contact_person.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen" style={{
      backgroundColor: '#e8e6e1'
    }}>
      {/* Header */}
      <div className="border-b px-6 py-4 border-gray-200"
      style={{
        backgroundColor: '#e8e6e1'
      }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
            <p className="mt-1 text-gray-600">{clients.length} total clients</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
            icon={Plus}
            onClick={() => setShowAddModal(true)}
          >
            Add Client
          </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Search */}
        <div className="mb-6">
          <Input
            placeholder="Search clients..."
            icon={Search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>

        {/* Clients Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => (
            <Card key={client.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {client.name}
                      {client.isDemo && <Badge variant="info" className="ml-2 text-xs">Demo</Badge>}
                    </h3>
                    <p className="text-sm text-gray-600">{client.industry}</p>
                  </div>
                </div>
                <Badge variant={client.status === 'active' ? 'success' : 'default'}>
                  {client.status}
                </Badge>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Mail className="h-4 w-4 mr-2" />
                  <a href={`mailto:${client.email}`} className="hover:text-blue-600">
                    {client.email}
                  </a>
                </div>
                {client.phone && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="h-4 w-4 mr-2" />
                    <a href={`tel:${client.phone}`} className="hover:text-blue-600">
                      {client.phone}
                    </a>
                  </div>
                )}
                {client.website && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Globe className="h-4 w-4 mr-2" />
                    <a href={client.website} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">
                      {client.website}
                    </a>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-600">Contact: {client.contact_person}</span>
                  <span className="text-sm font-medium text-gray-900">
                    {client.projects_count} projects
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    Added {new Date(client.created_at).toLocaleDateString()}
                  </span>
                  <div className="flex space-x-1">
                    <Button size="sm" variant="ghost" icon={Edit}>
                      <span onClick={(e) => {
                        e.stopPropagation();
                        handleEditClient(client);
                      }}>Edit</span>
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      icon={Trash2}
                      onClick={() => handleDeleteClient(client.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {filteredClients.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2 text-gray-900">No clients found</h3>
            <p className="mb-4 text-gray-600">Get started by adding your first client</p>
            <Button onClick={() => setShowAddModal(true)}>
              Add Your First Client
            </Button>
          </div>
        )}
      </div>

      {/* Add Client Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Client"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Company Name"
              value={newClient.name}
              onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
              placeholder="Acme Corporation"
              required
            />
            <Input
              label="Industry"
              value={newClient.industry}
              onChange={(e) => setNewClient({ ...newClient, industry: e.target.value })}
              placeholder="Technology"
              required
            />
          </div>
          
          <Input
            label="Contact Person"
            value={newClient.contact_person}
            onChange={(e) => setNewClient({ ...newClient, contact_person: e.target.value })}
            placeholder="John Smith"
            required
          />
          
          <Input
            label="Email"
            type="email"
            value={newClient.email}
            onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
            placeholder="contact@company.com"
            required
          />
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Phone"
              value={newClient.phone}
              onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
              placeholder="+1 (555) 123-4567"
            />
            <Input
              label="Website"
              value={newClient.website}
              onChange={(e) => setNewClient({ ...newClient, website: e.target.value })}
              placeholder="https://company.com"
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddClient}
              disabled={!newClient.name || !newClient.email || !newClient.contact_person}
            >
              Add Client
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Client Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingClient(null);
        }}
        title="Edit Client"
      >
        {editingClient && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Company Name"
                value={editingClient.name}
                onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })}
                placeholder="Acme Corporation"
                required
              />
              <Input
                label="Industry"
                value={editingClient.industry}
                onChange={(e) => setEditingClient({ ...editingClient, industry: e.target.value })}
                placeholder="Technology"
                required
              />
            </div>
            
            <Input
              label="Contact Person"
              value={editingClient.contact_person}
              onChange={(e) => setEditingClient({ ...editingClient, contact_person: e.target.value })}
              placeholder="John Smith"
              required
            />
            
            <Input
              label="Email"
              type="email"
              value={editingClient.email}
              onChange={(e) => setEditingClient({ ...editingClient, email: e.target.value })}
              placeholder="contact@company.com"
              required
            />
            
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Phone"
                value={editingClient.phone || ''}
                onChange={(e) => setEditingClient({ ...editingClient, phone: e.target.value })}
                placeholder="+1 (555) 123-4567"
              />
              <Input
                label="Website"
                value={editingClient.website || ''}
                onChange={(e) => setEditingClient({ ...editingClient, website: e.target.value })}
                placeholder="https://company.com"
              />
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowEditModal(false);
                  setEditingClient(null);
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateClient}
                disabled={!editingClient.name || !editingClient.email || !editingClient.contact_person}
              >
                Update Client
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};