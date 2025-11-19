const express = require('express');
const gatePassController = require('../controllers/gatepass.controller');

const router = express.Router();

// Gate pass routes
router.post('/', gatePassController.createGatePass.bind(gatePassController));
router.get('/', gatePassController.listGatePasses.bind(gatePassController));
router.get('/:id', gatePassController.getGatePass.bind(gatePassController));
router.get('/number/:pass_number', gatePassController.getGatePassByNumber.bind(gatePassController));
router.put('/:id/approve', gatePassController.approveGatePass.bind(gatePassController));
router.post('/verify', gatePassController.verifyGatePass.bind(gatePassController));

// Gate access logs
router.post('/access-log', gatePassController.logGateAccess.bind(gatePassController));
router.get('/access-log', gatePassController.getAccessLogs.bind(gatePassController));

// Visitor management
router.post('/visitors', gatePassController.registerVisitor.bind(gatePassController));
router.put('/visitors/:id/checkout', gatePassController.checkoutVisitor.bind(gatePassController));

module.exports = router;
