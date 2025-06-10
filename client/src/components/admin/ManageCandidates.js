import React, { useState, useEffect, useContext } from 'react';
import { Container, Card, Table, Form, Button, Row, Col, Alert, Spinner, InputGroup, Badge, Modal, Breadcrumb } from 'react-bootstrap';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import AuthContext from '../../context/AuthContext';

const ManageCandidates = () => {
  const { t } = useTranslation();
  const { electionId } = useParams();
  const { isAuthenticated, isAdmin } = useContext(AuthContext);
  const navigate = useNavigate();

  const [election, setElection] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [filteredCandidates, setFilteredCandidates] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [newCandidate, setNewCandidate] = useState({ address: '', name: '', party: '' });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [candidateToRemove, setCandidateToRemove] = useState(null);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) {
      navigate('/');
      return;
    }
    fetchElectionAndCandidates();
  }, [isAuthenticated, isAdmin, navigate, electionId]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredCandidates(candidates);
    } else {
      const filtered = candidates.filter(candidate =>
        candidate.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (candidate.name && candidate.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (candidate.party && candidate.party.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredCandidates(filtered);
    }
  }, [searchTerm, candidates]);

  const fetchElectionAndCandidates = async () => {
    try {
      setLoading(true);
      setError('');
      // Fetch election details
      const electionResponse = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/elections/${electionId}`,
        {
          headers: {
            'x-auth-token': localStorage.getItem('adminToken')
          }
        }
      );
      const electionData = await electionResponse.json();
      if (!electionData.success) {
        throw new Error(electionData.message || t('admin.candidates.election_fetch_error'));
      }
      setElection(electionData.election);
      // Fetch candidates for this election
      const candidatesResponse = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/elections/${electionId}/candidates`,
        {
          headers: {
            'x-auth-token': localStorage.getItem('adminToken')
          }
        }
      );
      const candidatesData = await candidatesResponse.json();
      if (!candidatesData.success) {
        throw new Error(candidatesData.message || t('admin.candidates.fetch_error'));
      }
      setCandidates(candidatesData.candidates || []);
      setFilteredCandidates(candidatesData.candidates || []);
    } catch (error) {
      setError(error.message || t('admin.candidates.fetch_error'));
      toast.error(error.message || t('admin.candidates.fetch_error'));
    } finally {
      setLoading(false);
    }
  };

  const validateEthereumAddress = (address) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  const handleAddCandidate = async () => {
    if (!validateEthereumAddress(newCandidate.address)) {
      toast.error(t('admin.candidates.invalid_address'));
      return;
    }
    if (!newCandidate.name || !newCandidate.party) {
      toast.error(t('admin.candidates.fields_required'));
      return;
    }
    try {
      setActionLoading(true);
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/elections/${electionId}/candidates`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-auth-token': localStorage.getItem('adminToken')
          },
          body: JSON.stringify(newCandidate)
        }
      );
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || t('admin.candidates.add_error'));
      }
      toast.success(t('admin.candidates.add_success'));
      setNewCandidate({ address: '', name: '', party: '' });
      setShowAddModal(false);
      fetchElectionAndCandidates();
    } catch (error) {
      toast.error(error.message || t('admin.candidates.add_error'));
    } finally {
      setActionLoading(false);
    }
  };

  const openRemoveModal = (candidate) => {
    setCandidateToRemove(candidate);
    setShowRemoveModal(true);
  };

  const handleRemoveCandidate = async () => {
    if (!candidateToRemove) return;
    try {
      setActionLoading(true);
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/elections/${electionId}/candidates/${candidateToRemove.address}`,
        {
          method: 'DELETE',
          headers: {
            'x-auth-token': localStorage.getItem('adminToken')
          }
        }
      );
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || t('admin.candidates.remove_error'));
      }
      toast.success(t('admin.candidates.remove_success'));
      setShowRemoveModal(false);
      setCandidateToRemove(null);
      fetchElectionAndCandidates();
    } catch (error) {
      toast.error(error.message || t('admin.candidates.remove_error'));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Container className="my-5 text-center">
        <Spinner animation="border" role="status" variant="primary">
          <span className="visually-hidden">{t('common.loading')}</span>
        </Spinner>
        <p className="mt-3">{t('admin.candidates.loading')}</p>
      </Container>
    );
  }

  // Puedes condicionar la edición según el estado de la elección si lo deseas
  const canModifyCandidates = election && !election.hasStarted && !election.hasEnded;

  return (
    <Container>
      {/* Breadcrumb navigation */}
      <Breadcrumb className="mb-4">
        <Breadcrumb.Item linkAs={Link} linkProps={{to: '/admin'}}>
          {t('admin.title')}
        </Breadcrumb.Item>
        <Breadcrumb.Item active>
          {t('admin.candidates.title')}
        </Breadcrumb.Item>
      </Breadcrumb>
      {/* Back button */}
      <div className="mb-4">
        <Button 
          as={Link} 
          to="/admin" 
          variant="outline-secondary" 
          size="sm"
          className="d-flex align-items-center gap-2"
        >
          <i className="fas fa-arrow-left"></i>
          {t('common.back')}
        </Button>
      </div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>{t('admin.candidates.title')}</h2>
          <p className="text-muted">
            {election ? election.title : ''} - {t('admin.candidates.registered_count', { count: candidates.length })}
          </p>
        </div>
        <Button variant="outline-secondary" onClick={() => navigate('/admin')}>
          <i className="fas fa-arrow-left me-2"></i>
          {t('common.back')}
        </Button>
      </div>
      {error && <Alert variant="danger">{error}</Alert>}
      {!canModifyCandidates && (
        <Alert variant="warning">
          <i className="fas fa-info-circle me-2"></i>
          {t('admin.candidates.cannot_modify')}
        </Alert>
      )}
      <Card className="shadow-sm mb-4">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <Form.Group className="mb-0" style={{ width: '60%' }}>
              <InputGroup>
                <InputGroup.Text>
                  <i className="fas fa-search"></i>
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder={t('admin.candidates.search_placeholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Form.Group>
            <div>
              <Button
                variant="success"
                className="me-2"
                onClick={() => setShowAddModal(true)}
                disabled={!canModifyCandidates}
              >
                <i className="fas fa-plus me-2"></i>
                {t('admin.candidates.add_candidate')}
              </Button>
            </div>
          </div>
          <div className="table-responsive">
            <Table striped hover>
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t('admin.candidates.address')}</th>
                  <th>{t('admin.candidates.name')}</th>
                  <th>{t('admin.candidates.party')}</th>
                  <th>{t('admin.candidates.status')}</th>
                  <th>{t('admin.candidates.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredCandidates.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-3">
                      {searchTerm ? t('admin.candidates.no_results') : t('admin.candidates.no_candidates')}
                    </td>
                  </tr>
                ) : (
                  filteredCandidates.map((candidate, index) => (
                    <tr key={candidate.address}>
                      <td>{index + 1}</td>
                      <td>
                        <div className="d-flex align-items-center">
                          <span className="d-inline-block text-truncate" style={{ maxWidth: '250px' }}>
                            {candidate.address}
                          </span>
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 ms-2"
                            onClick={() => {
                              navigator.clipboard.writeText(candidate.address);
                              toast.info(t('common.copied_to_clipboard'));
                            }}
                          >
                            <i className="fas fa-copy"></i>
                          </Button>
                        </div>
                      </td>
                      <td>{candidate.name}</td>
                      <td>{candidate.party}</td>
                      <td>
                        {candidate.active ? (
                          <Badge bg="success">{t('admin.candidates.active')}</Badge>
                        ) : (
                          <Badge bg="secondary">{t('admin.candidates.inactive')}</Badge>
                        )}
                      </td>
                      <td>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => openRemoveModal(candidate)}
                          disabled={!canModifyCandidates}
                        >
                          <i className="fas fa-trash-alt"></i>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
          {filteredCandidates.length > 0 && (
            <div className="d-flex justify-content-between align-items-center mt-3">
              <small className="text-muted">
                {searchTerm ? 
                  t('admin.candidates.showing_filtered', { count: filteredCandidates.length, total: candidates.length }) : 
                  t('admin.candidates.showing_all', { count: candidates.length })}
              </small>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => setSearchTerm('')}
                disabled={!searchTerm}
              >
                {t('admin.candidates.clear_search')}
              </Button>
            </div>
          )}
        </Card.Body>
      </Card>
      {/* Add Candidate Modal */}
      <Modal show={showAddModal} onHide={() => !actionLoading && setShowAddModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{t('admin.candidates.add_candidate')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group controlId="candidateAddress" className="mb-3">
            <Form.Label>{t('admin.candidates.enter_address')}</Form.Label>
            <Form.Control
              type="text"
              placeholder="0x..."
              value={newCandidate.address}
              onChange={(e) => setNewCandidate({ ...newCandidate, address: e.target.value })}
              disabled={actionLoading}
            />
            <Form.Text className="text-muted">
              {t('admin.candidates.address_format')}
            </Form.Text>
          </Form.Group>
          <Form.Group controlId="candidateName" className="mb-3">
            <Form.Label>{t('admin.candidates.enter_name')}</Form.Label>
            <Form.Control
              type="text"
              placeholder={t('admin.candidates.name_placeholder')}
              value={newCandidate.name}
              onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })}
              disabled={actionLoading}
            />
          </Form.Group>
          <Form.Group controlId="candidateParty">
            <Form.Label>{t('admin.candidates.enter_party')}</Form.Label>
            <Form.Control
              type="text"
              placeholder={t('admin.candidates.party_placeholder')}
              value={newCandidate.party}
              onChange={(e) => setNewCandidate({ ...newCandidate, party: e.target.value })}
              disabled={actionLoading}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddModal(false)} disabled={actionLoading}>
            {t('common.cancel')}
          </Button>
          <Button variant="success" onClick={handleAddCandidate} disabled={actionLoading}>
            {actionLoading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                {t('common.processing')}
              </>
            ) : (
              t('admin.candidates.add')
            )}
          </Button>
        </Modal.Footer>
      </Modal>
      {/* Remove Candidate Confirmation Modal */}
      <Modal 
        show={showRemoveModal} 
        onHide={() => !actionLoading && setShowRemoveModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>{t('admin.candidates.remove_candidate')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>{t('admin.candidates.remove_confirm')}</p>
          <div className="bg-light p-3 rounded mb-3">
            <code>{candidateToRemove?.address}</code>
          </div>
          <Alert variant="warning">
            <i className="fas fa-exclamation-triangle me-2"></i>
            {t('admin.candidates.remove_warning')}
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRemoveModal(false)} disabled={actionLoading}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" onClick={handleRemoveCandidate} disabled={actionLoading}>
            {actionLoading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                {t('common.processing')}
              </>
            ) : (
              t('admin.candidates.remove')
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ManageCandidates;