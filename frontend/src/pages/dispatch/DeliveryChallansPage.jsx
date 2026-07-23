import React, { useState, useEffect } from 'react';
import { Truck } from 'lucide-react';
import {
  getChallans,
  createChallan,
  getChallanById,
  addTransportDetails,
  uploadPOD,
  getPackingSlips
} from '../../api/dispatchApi';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import Table from '../../components/Table';

export default function DeliveryChallansPage() {
  const [challans, setChallans] = useState([]);
  const [packingSlips, setPackingSlips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTransportModal, setShowTransportModal] = useState(false);
  const [showPodModal, setShowPodModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Selected Challan/Slip Data
  const [selectedChallanId, setSelectedChallanId] = useState('');
  const [selectedChallanDetails, setSelectedChallanDetails] = useState(null);
  const [selectedPackingSlipId, setSelectedPackingSlipId] = useState('');

  // Form States
  const [transporterName, setTransporterName] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [lrNumber, setLrNumber] = useState('');
  const [dispatchDate, setDispatchDate] = useState('');

  const [receivedBy, setReceivedBy] = useState('');
  const [deliveredAt, setDeliveredAt] = useState('');
  const [podFile, setPodFile] = useState(null);
  const [podNotes, setPodNotes] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [dcRes, psRes] = await Promise.all([
        getChallans(),
        getPackingSlips()
      ]);
      setChallans(dcRes.challans || []);
      setPackingSlips(psRes.packingSlips || []);
    } catch (err) {
      setError('Failed to fetch challan data.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChallan = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await createChallan({ packing_slip_id: selectedPackingSlipId });
      setSuccess('Delivery Challan created successfully.');
      setShowCreateModal(false);
      setSelectedPackingSlipId('');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create challan.');
    }
  };

  const handleOpenTransport = (dc) => {
    setSelectedChallanId(dc.id);
    setTransporterName(dc.transporter_name || '');
    setVehicleNo(dc.vehicle_no || '');
    setLrNumber(dc.lr_number || '');
    setDispatchDate(dc.dispatch_date ? new Date(dc.dispatch_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
    setShowTransportModal(true);
  };

  const handleSaveTransport = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await addTransportDetails(selectedChallanId, {
        transporter_name: transporterName,
        vehicle_no: vehicleNo,
        lr_number: lrNumber,
        dispatch_date: dispatchDate
      });
      setSuccess('Transport details updated and status set to Dispatched.');
      setShowTransportModal(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update transport.');
    }
  };

  const handleOpenPod = (dcId) => {
    setSelectedChallanId(dcId);
    setReceivedBy('');
    setDeliveredAt(new Date().toISOString().slice(0, 10));
    setPodFile(null);
    setPodNotes('');
    setShowPodModal(true);
  };

  const handleUploadPod = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('received_by', receivedBy);
    formData.append('delivered_at', deliveredAt);
    formData.append('notes', podNotes);
    if (podFile) {
      formData.append('pod', podFile);
    }

    try {
      await uploadPOD(selectedChallanId, formData);
      setSuccess('Proof of Delivery uploaded and Order marked as Delivered.');
      setShowPodModal(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload POD.');
    }
  };

  const handlePrintPreview = async (dcId) => {
    try {
      const res = await getChallanById(dcId);
      setSelectedChallanDetails(res);
      setShowPrintModal(true);
    } catch (err) {
      setError('Failed to load challan print details.');
    }
  };

  const handleTriggerPrint = () => {
    window.print();
  };

  const columns = [
    {
      key: 'challan_no',
      label: 'DC No',
      render: (dc) => <span className="font-mono text-accent-primary font-medium">{dc.challan_no || 'Pending'}</span>
    },
    {
      key: 'packing_slip_no',
      label: 'Packing Slip',
      render: (dc) => <span className="font-mono text-text-secondary text-xs">{dc.packing_slip_no || '—'}</span>
    },
    {
      key: 'sales_order_no',
      label: 'Sales Order',
      render: (dc) => <span className="font-mono text-text-secondary">{dc.sales_order_no || '—'}</span>
    },
    {
      key: 'customer_name',
      label: 'Customer',
      render: (dc) => <span className="font-semibold text-text-primary">{dc.customer_name}</span>
    },
    {
      key: 'challan_date',
      label: 'Challan Date',
      render: (dc) => <span className="text-text-secondary">{new Date(dc.challan_date).toLocaleDateString()}</span>
    },
    {
      key: 'status',
      label: 'Status',
      render: (dc) => (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
          dc.status === 'Delivered' ? 'bg-accent-success/15 text-accent-success border border-accent-success/30' :
          dc.status === 'Dispatched' ? 'bg-accent-info/15 text-accent-info border border-accent-info/30' :
          'bg-accent-warning/15 text-accent-warning border border-accent-warning/30'
        }`}>
          {dc.status}
        </span>
      )
    },
    {
      key: 'pod',
      label: 'POD',
      render: (dc) => dc.pod_file_url ? (
        <a href={dc.pod_file_url} target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:underline text-xs flex items-center gap-1 font-semibold">
          ✓ View POD
        </a>
      ) : (
        <span className="text-text-muted text-xs">Pending</span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (dc) => (
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => handlePrintPreview(dc.id)}
            className="px-2.5 py-1 bg-bg-secondary hover:bg-bg-hover border border-border-color rounded-xl text-xs font-semibold text-text-primary transition-all"
          >
            Print
          </button>
          {dc.status === 'Draft' && (
            <button
              onClick={() => handleOpenTransport(dc)}
              className="px-2.5 py-1 bg-accent-primary hover:opacity-90 rounded-xl text-xs text-white font-semibold shadow-sm transition-all"
            >
              Dispatch
            </button>
          )}
          {dc.status === 'Dispatched' && (
            <button
              onClick={() => handleOpenPod(dc.id)}
              className="px-2.5 py-1 bg-accent-success hover:opacity-90 rounded-xl text-xs text-white font-semibold shadow-sm transition-all"
            >
              Confirm Del.
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl animate-in fade-in duration-300">
      <PageHeader
        title="Delivery Challans"
        description="Generate challans, add transport logs, and upload POD confirmations."
        actions={
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center rounded-xl bg-accent-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-colors"
          >
            + Create Delivery Challan
          </button>
        }
      />

      {error && <div className="mb-6 p-4 bg-accent-danger/10 border border-accent-danger/30 rounded-2xl text-accent-danger text-sm">{error}</div>}
      {success && <div className="mb-6 p-4 bg-accent-success/10 border border-accent-success/30 rounded-2xl text-accent-success text-sm">{success}</div>}

      {challans.length === 0 && !loading ? (
        <EmptyState
          icon={Truck}
          title="No Delivery Challans Found"
          description="Generate delivery challans directly from packed sales orders to begin shipment tracking."
          actionLabel="Create Delivery Challan"
          onAction={() => setShowCreateModal(true)}
        />
      ) : (
        <Table columns={columns} data={challans} loading={loading} emptyMessage="No delivery challans found." />
      )}

      {/* CREATE CHALLAN MODAL */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Generate Delivery Challan"
        size="md"
      >
        <form onSubmit={handleCreateChallan} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5">Select Packing Slip *</label>
            <select
              value={selectedPackingSlipId}
              onChange={(e) => setSelectedPackingSlipId(e.target.value)}
              className="w-full bg-bg-secondary border border-border-color rounded-xl p-2.5 text-text-primary text-sm focus:outline-none focus:border-accent-primary"
              required
            >
              <option value="">-- Select Packing Slip --</option>
              {packingSlips.map(ps => (
                <option key={ps.id} value={ps.id}>{ps.packing_slip_no} ({ps.customer_name})</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border-color">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 bg-bg-secondary border border-border-color hover:bg-bg-hover rounded-xl text-text-secondary text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-accent-primary hover:opacity-90 rounded-xl text-white font-semibold text-sm shadow-sm"
            >
              Generate DC
            </button>
          </div>
        </form>
      </Modal>

      {/* TRANSPORT MODAL */}
      <Modal
        isOpen={showTransportModal}
        onClose={() => setShowTransportModal(false)}
        title="Add Transport Details"
        size="md"
      >
        <form onSubmit={handleSaveTransport} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Transporter Name *</label>
            <input
              type="text"
              value={transporterName}
              onChange={(e) => setTransporterName(e.target.value)}
              className="w-full bg-bg-secondary border border-border-color rounded-xl p-2.5 text-text-primary text-sm focus:outline-none focus:border-accent-primary"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Vehicle No *</label>
            <input
              type="text"
              value={vehicleNo}
              onChange={(e) => setVehicleNo(e.target.value)}
              className="w-full bg-bg-secondary border border-border-color rounded-xl p-2.5 text-text-primary text-sm focus:outline-none focus:border-accent-primary"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">LR / Docket Number</label>
            <input
              type="text"
              value={lrNumber}
              onChange={(e) => setLrNumber(e.target.value)}
              className="w-full bg-bg-secondary border border-border-color rounded-xl p-2.5 text-text-primary text-sm focus:outline-none focus:border-accent-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Dispatch Date</label>
            <input
              type="date"
              value={dispatchDate}
              onChange={(e) => setDispatchDate(e.target.value)}
              className="w-full bg-bg-secondary border border-border-color rounded-xl p-2.5 text-text-primary text-sm font-mono focus:outline-none focus:border-accent-primary"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border-color">
            <button
              type="button"
              onClick={() => setShowTransportModal(false)}
              className="px-4 py-2 bg-bg-secondary border border-border-color hover:bg-bg-hover rounded-xl text-text-secondary text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-accent-primary hover:opacity-90 rounded-xl text-white font-semibold text-sm shadow-sm"
            >
              Log Dispatch
            </button>
          </div>
        </form>
      </Modal>

      {/* POD MODAL */}
      <Modal
        isOpen={showPodModal}
        onClose={() => setShowPodModal(false)}
        title="Upload Proof of Delivery"
        size="md"
      >
        <form onSubmit={handleUploadPod} className="space-y-4" encType="multipart/form-data">
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Received By (Name) *</label>
            <input
              type="text"
              value={receivedBy}
              onChange={(e) => setReceivedBy(e.target.value)}
              className="w-full bg-bg-secondary border border-border-color rounded-xl p-2.5 text-text-primary text-sm focus:outline-none focus:border-accent-primary"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Delivered At Date</label>
            <input
              type="date"
              value={deliveredAt}
              onChange={(e) => setDeliveredAt(e.target.value)}
              className="w-full bg-bg-secondary border border-border-color rounded-xl p-2.5 text-text-primary text-sm font-mono focus:outline-none focus:border-accent-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Upload File (PDF/Image)</label>
            <input
              type="file"
              onChange={(e) => setPodFile(e.target.files[0])}
              className="w-full bg-bg-secondary border border-border-color rounded-xl p-2 text-text-primary text-xs focus:outline-none focus:border-accent-primary"
              accept=".pdf,.png,.jpg,.jpeg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Remarks</label>
            <textarea
              value={podNotes}
              onChange={(e) => setPodNotes(e.target.value)}
              className="w-full bg-bg-secondary border border-border-color rounded-xl p-2.5 text-text-primary text-sm h-20 focus:outline-none focus:border-accent-primary"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border-color">
            <button
              type="button"
              onClick={() => setShowPodModal(false)}
              className="px-4 py-2 bg-bg-secondary border border-border-color hover:bg-bg-hover rounded-xl text-text-secondary text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-accent-success hover:opacity-90 rounded-xl text-white font-semibold text-sm shadow-sm"
            >
              Submit POD
            </button>
          </div>
        </form>
      </Modal>

      {/* PRINT MODAL */}
      <Modal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        title="Delivery Challan Document"
        size="lg"
      >
        {selectedChallanDetails && (
          <div className="space-y-6">
            <div id="printable-challan" className="space-y-6 bg-white text-slate-900 p-6 rounded-2xl border border-slate-200">
              <div className="flex justify-between items-start border-b-2 border-slate-300 pb-4">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-800">ERP ENTERPRISE</h2>
                  <p className="text-xs text-slate-500">123 Industrial Area, Block C</p>
                  <p className="text-xs text-slate-500">GSTIN: 27AAAAA0000A1Z5</p>
                </div>
                <div className="text-right">
                  <h3 className="text-lg font-bold text-slate-700">DELIVERY CHALLAN</h3>
                  <p className="text-sm font-mono font-bold text-blue-600 mt-0.5">{selectedChallanDetails.challan.challan_no}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Date: {new Date(selectedChallanDetails.challan.challan_date).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl">
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Consignee (Deliver To)</h4>
                  <p className="font-bold text-slate-800 text-sm mt-1">{selectedChallanDetails.challan.customer_name}</p>
                  <p className="text-xs text-slate-600 whitespace-pre-wrap mt-0.5">{selectedChallanDetails.challan.customer_address}</p>
                  <p className="text-xs text-slate-500 font-mono mt-1">GSTIN: {selectedChallanDetails.challan.customer_gstin || 'N/A'}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Transport & Dispatch Details</h4>
                  {selectedChallanDetails.transport ? (
                    <div className="text-xs text-slate-600 mt-1 space-y-0.5">
                      <p><span className="font-semibold text-slate-700">Transporter:</span> {selectedChallanDetails.transport.transporter_name}</p>
                      <p><span className="font-semibold text-slate-700">Vehicle No:</span> {selectedChallanDetails.transport.vehicle_no}</p>
                      <p><span className="font-semibold text-slate-700">LR / Docket:</span> {selectedChallanDetails.transport.lr_number || '—'}</p>
                      <p><span className="font-semibold text-slate-700">Dispatch Date:</span> {new Date(selectedChallanDetails.transport.dispatch_date).toLocaleDateString()}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 mt-1 italic">Transport info pending</p>
                  )}
                </div>
              </div>

              <div>
                <table className="w-full text-left border-collapse border border-slate-300 text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-300">
                      <th className="p-2.5 border border-slate-300">Item Code</th>
                      <th className="p-2.5 border border-slate-300">Item Description</th>
                      <th className="p-2.5 border border-slate-300">Batch No</th>
                      <th className="p-2.5 border border-slate-300 text-right">Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300 text-slate-700">
                    {selectedChallanDetails.items.map((item) => (
                      <tr key={item.id}>
                        <td className="p-2.5 border border-slate-300 font-mono">{item.item_code}</td>
                        <td className="p-2.5 border border-slate-300 font-medium">{item.item_name}</td>
                        <td className="p-2.5 border border-slate-300 font-mono text-xs">{item.batch_no || '—'}</td>
                        <td className="p-2.5 border border-slate-300 text-right font-semibold">{item.qty} {item.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-end pt-8">
                <div className="w-1/2">
                  <p className="text-[11px] text-slate-500 italic">Declaration: Material received in good condition and order requirements satisfied.</p>
                </div>
                <div className="text-center w-1/3 border-t border-slate-400 pt-2">
                  <p className="text-xs font-bold text-slate-600">Authorized Signatory</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border-color">
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2 bg-bg-secondary border border-border-color hover:bg-bg-hover rounded-xl text-text-secondary text-sm font-semibold"
              >
                Close
              </button>
              <button
                onClick={handleTriggerPrint}
                className="px-5 py-2 bg-accent-primary hover:opacity-90 rounded-xl text-white font-semibold text-sm shadow-sm"
              >
                Print Challan
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
