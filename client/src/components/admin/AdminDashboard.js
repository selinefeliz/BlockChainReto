import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Table, Badge, Alert, Spinner, Tabs, Tab } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import AdminContext from '../../context/AdminContext';
import { formatTimestamp, formatAddress, isElectionActive, hasElectionEnded } from '../../utils/contractUtils';
import { toast } from 'react-toastify';
import StatsDashboard from './stats/StatsDashboard';
import VotingTokenABI from '../../abis/VotingToken.json';
import { getWeb3 } from '../../utils/web3Utils';
import axios from 'axios';

const AdminDashboard = () => {
  const [elections, setElections] = useState([]);
  const [voterStats, setVoterStats] = useState({ totalRegistered: 0, totalVoted: 0 });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const { isAdminAuthenticated, adminPermissions } = useContext(AdminContext);
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [adminAddress, setAdminAddress] = useState('');
  const [tokenLoading, setTokenLoading] = useState(false);

  // Fetch elections from backend
  const fetchElections = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await axios.get('/api/admin/elections', {
        headers: {
          'x-auth-token': localStorage.getItem('adminToken')
        }
      });
      setElections(res.data.data || []);
    } catch (error) {
      setError('Error al cargar las elecciones');
      console.error('Error fetching elections:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch voter statistics
  const fetchVoterStats = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await axios.get('/api/admin/statistics/voters', {
        headers: {
          'x-auth-token': localStorage.getItem('adminToken')
        }
      });
      setVoterStats(res.data.data || { totalRegistered: 0, totalVoted: 0 });
    } catch (error) {
      setError('Error al cargar las estadísticas de votantes');
      console.error('Error fetching voter stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchVoterStats();
    getAdminAddress();
  }, [isAdminAuthenticated, adminPermissions, navigate, fetchElections, fetchVoterStats]);

  // Fetch connected wallet users (if relevant)
  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/wallet/list');
      const data = await res.json();
      setUsers(data.users || []);
    } catch (error) {
      toast.error('Error cargando usuarios conectados');
    }
  };

  // Get admin wallet address (if relevant)
  const getAdminAddress = async () => {
    try {
      const web3 = await getWeb3();
      const accounts = await web3.eth.getAccounts();
      setAdminAddress(accounts[0]);
    } catch (error) {
      setAdminAddress('');
    }
  };

  const VOTING_TOKEN_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

  const assignToken = async (userAddress) => {
    setTokenLoading(true);
    try {
      const web3 = await getWeb3();
      const contract = new web3.eth.Contract(VotingTokenABI, VOTING_TOKEN_ADDRESS);
      await contract.methods.transfer(userAddress, web3.utils.toWei('1', 'ether')).send({ from: adminAddress });
      // Marca en backend que ese usuario ya tiene token
      await fetch('/api/wallet/mark-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: userAddress })
      });
      fetchUsers();
      toast.success('Token asignado correctamente');
    } catch (error) {
      toast.error('Error asignando token: ' + (error.message || error));
    }
    setTokenLoading(false);
  };

  // Redirección y permisos
  useEffect(() => {
    if (!isAdminAuthenticated) {
      navigate('/admin/login');
      return;
    }
    if (!adminPermissions.canViewDashboard) {
      toast.error('No tienes permisos para acceder al panel de administración');
      navigate('/');
      return;
    }
    fetchElections();
  }, [isAdminAuthenticated, adminPermissions, navigate, fetchElections]);

  // Finalizar elección (API real)
  const handleEndElection = async (electionId) => {
    try {
      setActionLoading(true);
      const token = localStorage.getItem('adminToken');
      await axios.put(`/api/admin/elections/${electionId}`, {
        endTime: Math.floor(Date.now() / 1000)
      }, {
        headers: { 'x-auth-token': token }
      });
      toast.success('Elección finalizada correctamente');
      fetchElections();
    } catch (error) {
      toast.error('Error al finalizar la elección');
    } finally {
      setActionLoading(false);
    }
  };

  // Finalizar resultados (API real)
  const handleFinalizeResults = async (electionId) => {
    try {
      setActionLoading(true);
      const token = localStorage.getItem('adminToken');
      await axios.put(`/api/admin/elections/${electionId}`, {
        resultsFinalized: true
      }, {
        headers: { 'x-auth-token': token }
      });
      toast.success('Resultados finalizados correctamente');
      fetchElections();
    } catch (error) {
      toast.error('Error al finalizar los resultados');
    } finally {
      setActionLoading(false);
    }
  };

  // ELIMINAR ELECCIÓN (API real)
  const handleDeleteElection = async (electionId) => {
    if (!window.confirm('¿Seguro que quieres eliminar esta elección?')) return;
    try {
      setActionLoading(true);
      const token = localStorage.getItem('adminToken');
      await axios.delete(`/api/admin/elections/${electionId}`, {
        headers: { 'x-auth-token': token }
      });
      toast.success('Elección eliminada');
      fetchElections();
    } catch (error) {
      toast.error('Error al eliminar la elección');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (election) => {
    if (election.resultsFinalized) return <Badge bg="success">Finalizada</Badge>;
    if (hasElectionEnded(election)) return <Badge bg="warning">Terminada</Badge>;
    if (isElectionActive(election)) return <Badge bg="primary">Activa</Badge>;
    return <Badge bg="secondary">Pendiente</Badge>;
  };

  return (
    <Container fluid className="py-4">
      <h2 className="mb-4">Panel de Administración</h2>
      {error && <Alert variant="danger">{error}</Alert>}
      <Tabs 
        activeKey={activeTab} 
        onSelect={(key) => setActiveTab(key)} 
        className="mb-4"
      >
        <Tab eventKey="overview" title="Resumen">
          <Row className="g-3 mb-4">
            <Col md={3}>
              <Card className="h-100 shadow-sm">
                <Card.Body className="d-flex flex-column align-items-center">
                  <i className="fas fa-vote-yea text-primary mb-3 fa-3x"></i>
                  <h2 className="mb-0">{elections.length}</h2>
                  <p className="text-muted">Elecciones Totales</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="h-100 shadow-sm">
                <Card.Body className="d-flex flex-column align-items-center">
                  <i className="fas fa-user-check text-success mb-3 fa-3x"></i>
                  <h2 className="mb-0">{voterStats.totalRegistered}</h2>
                  <p className="text-muted">Votantes Registrados</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="h-100 shadow-sm">
                <Card.Body className="d-flex flex-column align-items-center">
                  <i className="fas fa-poll text-info mb-3 fa-3x"></i>
                  <h2 className="mb-0">{voterStats.totalVoted}</h2>
                  <p className="text-muted">Votos Emitidos</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="h-100 shadow-sm">
                <Card.Body className="d-flex flex-column align-items-center">
                  <i className="fas fa-percentage text-warning mb-3 fa-3x"></i>
                  <h2 className="mb-0">
                    {voterStats.totalRegistered > 0 
                      ? Math.round((voterStats.totalVoted / voterStats.totalRegistered) * 100) 
                      : 0}%
                  </h2>
                  <p className="text-muted">Participación</p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
          <Card className="shadow-sm mb-4">
            <Card.Header>
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Elecciones Activas</h5>
                <Button 
                  as={Link} 
                  to="/admin/create-election" 
                  variant="primary" 
                  size="sm"
                  disabled={!adminPermissions.canCreateElection}
                >
                  <i className="fas fa-plus me-2"></i>
                  Nueva Elección
                </Button>
              </div>
            </Card.Header>
            <Card.Body>
              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" role="status" variant="primary">
                    <span className="visually-hidden">Cargando...</span>
                  </Spinner>
                </div>
              ) : elections.length > 0 ? (
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Título</th>
                      <th>Estado</th>
                      <th>Inicio</th>
                      <th>Fin</th>
                      <th>Votos</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {elections.map((election) => (
                      <tr key={election._id || election.id}>
                        <td>{election._id || election.id}</td>
                        <td>{election.title}</td>
                        <td>{getStatusBadge(election)}</td>
                        <td>{formatTimestamp(election.startTime)}</td>
                        <td>{formatTimestamp(election.endTime)}</td>
                        <td>{election.totalVotes || 0}</td>
                        <td>
                          <div className="d-flex">
                            <Button
                              as={Link}
                              to={`/admin/elections/${election._id || election.id}`}
                              variant="outline-primary"
                              size="sm"
                              className="me-2"
                              disabled={!adminPermissions.canViewElection}
                            >
                              <i className="fas fa-eye"></i>
                            </Button>
                            {isElectionActive(election) && (
                              <Button
                                variant="outline-warning"
                                size="sm"
                                className="me-2"
                                onClick={() => handleEndElection(election._id || election.id)}
                                disabled={actionLoading || !adminPermissions.canEndElection}
                              >
                                <i className="fas fa-stop-circle"></i>
                              </Button>
                            )}
                            {hasElectionEnded(election) && !election.resultsFinalized && (
                              <Button
                                variant="outline-success"
                                size="sm"
                                className="me-2"
                                onClick={() => handleFinalizeResults(election._id || election.id)}
                                disabled={actionLoading || !adminPermissions.canFinalizeResults}
                              >
                                <i className="fas fa-check-double"></i>
                              </Button>
                            )}
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDeleteElection(election._id || election.id)}
                              disabled={actionLoading || !adminPermissions.canDeleteElection}
                            >
                              <i className="fas fa-trash"></i>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted mb-0">No hay elecciones activas</p>
                  {adminPermissions.canCreateElection && (
                    <Button 
                      as={Link} 
                      to="/admin/create-election" 
                      variant="primary" 
                      className="mt-3"
                    >
                      Crear Nueva Elección
                    </Button>
                  )}
                </div>
              )}
            </Card.Body>
          </Card>
          <Card className="shadow-sm">
            <Card.Header>
              <h5 className="mb-0">Enlaces Rápidos</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={3} className="mb-3 mb-md-0">
                  <Button
                    as={Link}
                    to="/admin/voters"
                    variant="outline-primary"
                    className="w-100 py-3"
                    disabled={!adminPermissions.canManageVoters}
                  >
                    <i className="fas fa-users mb-2 fa-2x"></i>
                    <div>Gestión de Votantes</div>
                  </Button>
                </Col>
                <Col md={3} className="mb-3 mb-md-0">
                  <Button
                    as={Link}
                    to="/admin/candidates"
                    variant="outline-primary"
                    className="w-100 py-3"
                    disabled={!adminPermissions.canManageCandidates}
                  >
                    <i className="fas fa-user-tie mb-2 fa-2x"></i>
                    <div>Gestión de Candidatos</div>
                  </Button>
                </Col>
                <Col md={3} className="mb-3 mb-md-0">
                  <Button
                    as={Link}
                    to="/admin/settings"
                    variant="outline-primary"
                    className="w-100 py-3"
                    disabled={!adminPermissions.canManageSettings}
                  >
                    <i className="fas fa-cogs mb-2 fa-2x"></i>
                    <div>Configuración</div>
                  </Button>
                </Col>
                <Col md={3}>
                  <Button
                    as={Link}
                    to="/admin/activity"
                    variant="outline-primary"
                    className="w-100 py-3"
                    disabled={!adminPermissions.canViewActivity}
                  >
                    <i className="fas fa-history mb-2 fa-2x"></i>
                    <div>Registro de Actividad</div>
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>
          <Card className="shadow-sm mt-4">
            <Card.Header>
              <h5 className="mb-0">Usuarios conectados (Wallets)</h5>
            </Card.Header>
            <Card.Body>
              {users.length === 0 ? (
                <div className="text-muted">No hay usuarios conectados aún.</div>
              ) : (
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>Dirección</th>
                      <th>¿Tiene token?</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.address}>
                        <td>{formatAddress ? formatAddress(u.address) : u.address}</td>
                        <td>
                          {u.hasToken ? <Badge bg="success">Sí</Badge> : <Badge bg="secondary">No</Badge>}
                        </td>
                        <td>
                          {!u.hasToken && (
                            <Button
                              size="sm"
                              variant="primary"
                              disabled={tokenLoading}
                              onClick={() => assignToken(u.address)}
                            >
                              Asignar token
                            </Button>
                          )}
                          {u.hasToken && <span>✔️</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Tab>
        <Tab eventKey="statistics" title="Estadísticas">
          <StatsDashboard />
        </Tab>
      </Tabs>
      <Row className="mb-4">
        <Col>
          <Card className="shadow-sm">
            <Card.Header>
              <h5 className="mb-0">Actividad Reciente</h5>
            </Card.Header>
            <Card.Body>
              <div className="ps-2">
                <div className="activity-stream">
                  {/* En una aplicación real, obtendrías esto de un registro de auditoría */}
                  <div className="activity-item d-flex align-items-start">
                    <div className="activity-icon me-3">
                      <i className="fas fa-check-circle text-success"></i>
                    </div>
                    <div className="flex-grow-1">
                      <div className="d-flex justify-content-between">
                        <strong>Elección creada</strong>
                        <small className="text-muted">hace 2 horas</small>
                      </div>
                      <p className="mb-0">Nueva elección "Presupuesto Municipal 2025" fue creada</p>
                    </div>
                  </div>
                  {/* ...más actividades de ejemplo o reales... */}
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default AdminDashboard;