import React, { useState } from 'react';
import { Plus, Search, Building2, Globe, Mail, Phone } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { mockCompanies } from '../data/mockData';
import { Company } from '../types';
import { useTheme } from '../contexts/ThemeContext';

export const Companies: React.FC = () => {
  const { isDark } = useTheme();
  const [companies, setCompanies] = useState(mockCompanies);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showCompanyModal, setShowCompanyModal] = useState(false);

  const handleCompanyClick = (company: Company) => {
    setSelectedCompany(company);
    setShowCompanyModal(true);
  };

  const filteredCompanies = companies.filter(company => {
    const matchesSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         company.industry?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         company.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getSizeColor = (size: Company['size']) => {
    switch (size) {
      case 'startup':
        return 'default';
      case 'small':
        return 'info';
      case 'medium':
        return 'warning';
      case 'large':
        return 'success';
      case 'enterprise':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <div className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Header 
        title="Companies" 
        subtitle={`${companies.length} client companies`}
        actions={
          <Button icon={Plus}>
            Add Company
          </Button>
        }
      />
      
      <div className="p-6">
        {/* Search */}
        <div className={`rounded-lg shadow-sm border p-4 mb-6 ${
          isDark 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search companies..."
                icon={Search}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm">
              Filter
            </Button>
          </div>
        </div>

        {/* Companies Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCompanies.map((company) => (
            <Card 
              key={company.id} 
              className="hover:shadow-md transition-shadow"
              onClick={() => handleCompanyClick(company)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    {company.logo_url ? (
                      <img
                        src={company.logo_url}
                        alt={company.name}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                    ) : (
                      <Building2 className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{company.name}</h3>
                    <p className="text-sm text-gray-600">{company.industry}</p>
                  </div>
                </div>
                <Badge variant={getSizeColor(company.size)}>
                  {company.size}
                </Badge>
              </div>

              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {company.description}
              </p>

              <div className="space-y-2">
                {company.website && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Globe className="h-4 w-4 mr-2" />
                    <a href={company.website} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">
                      {company.website}
                    </a>
                  </div>
                )}
                {company.email && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="h-4 w-4 mr-2" />
                    <a href={`mailto:${company.email}`} className="hover:text-blue-600">
                      {company.email}
                    </a>
                  </div>
                )}
                {company.phone && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="h-4 w-4 mr-2" />
                    <a href={`tel:${company.phone}`} className="hover:text-blue-600">
                      {company.phone}
                    </a>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>Founded {company.founded_year}</span>
                  <span>Added {new Date(company.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {filteredCompanies.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500">
              <Building2 className="h-12 w-12 mx-auto mb-4" />
              <p className="text-lg font-medium">No companies found</p>
              <p className="text-sm">Try adjusting your search</p>
            </div>
          </div>
        )}
      </div>

      {/* Company Details Modal */}
      <Modal
        isOpen={showCompanyModal}
        onClose={() => setShowCompanyModal(false)}
        title={selectedCompany?.name || 'Company Details'}
        size="lg"
      >
        {selectedCompany && (
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                {selectedCompany.logo_url ? (
                  <img
                    src={selectedCompany.logo_url}
                    alt={selectedCompany.name}
                    className="w-14 h-14 rounded-lg object-cover"
                  />
                ) : (
                  <Building2 className="h-8 w-8 text-gray-400" />
                )}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{selectedCompany.name}</h3>
                <p className="text-gray-600">{selectedCompany.industry}</p>
                <Badge variant={getSizeColor(selectedCompany.size)}>
                  {selectedCompany.size}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Company Information</h4>
                <div className="space-y-2 text-sm">
                  <p><strong>Founded:</strong> {selectedCompany.founded_year}</p>
                  <p><strong>Industry:</strong> {selectedCompany.industry}</p>
                  <p><strong>Size:</strong> {selectedCompany.size}</p>
                  <p><strong>Type:</strong> {selectedCompany.type}</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Contact Information</h4>
                <div className="space-y-2 text-sm">
                  {selectedCompany.email && (
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-2 text-gray-400" />
                      <a href={`mailto:${selectedCompany.email}`} className="text-blue-600 hover:text-blue-800">
                        {selectedCompany.email}
                      </a>
                    </div>
                  )}
                  {selectedCompany.phone && (
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2 text-gray-400" />
                      <a href={`tel:${selectedCompany.phone}`} className="text-blue-600 hover:text-blue-800">
                        {selectedCompany.phone}
                      </a>
                    </div>
                  )}
                  {selectedCompany.website && (
                    <div className="flex items-center">
                      <Globe className="h-4 w-4 mr-2 text-gray-400" />
                      <a href={selectedCompany.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                        {selectedCompany.website}
                      </a>
                    </div>
                  )}
                </div>
            {selectedCompany.description && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Description</h4>
                <p className="text-gray-700">{selectedCompany.description}</p>
              </div>
            )}
              </div>
            {selectedCompany.address && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Address</h4>
                <div className="text-sm text-gray-700">
                  {selectedCompany.address.street && <p>{selectedCompany.address.street}</p>}
                  <p>
                    {selectedCompany.address.city && `${selectedCompany.address.city}, `}
                    {selectedCompany.address.state && `${selectedCompany.address.state} `}
                    {selectedCompany.address.postal_code}
                  </p>
                  {selectedCompany.address.country && <p>{selectedCompany.address.country}</p>}
                </div>
              </div>
            )}
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <Button variant="outline" onClick={() => setShowCompanyModal(false)}>
                Close
              </Button>
              <Button>
                Edit Company
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};