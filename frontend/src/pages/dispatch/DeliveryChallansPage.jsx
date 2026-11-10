import React, { useState, useEffect } from 'react';
import { Truck, Printer, ExternalLink } from 'lucide-react';
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
import StatusBadge from '../../components/StatusBadge';
import { formatDate } from '../../utils/formatDate';

const env = import.meta.env;
const COMPANY_NAME = env.VITE_COMPANY_NAME || 'ERP Nexus Enterprise Ltd.';
const COMPANY_ADDRESS = env.VITE_COMPANY_ADDRESS || '123 Industrial Area, Phase II, New Delhi - 110020, India';
const COMPANY_GSTIN = env.VITE_COMPANY_GSTIN || '07AAAAA1111A1Z0';
const COMPANY_PAN = 'AAAAA1111A';
const COMPANY_STATE = 'Delhi (07)';

const formatQty = (qty) => {
  const num = parseFloat(qty) || 0;
  return num % 1 === 0 ? num.toFixed(0) : num.toFixed(2);
};

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
      render: (dc) => <span className="stamp">{dc.challan_no || 'Pending'}</span>
    },
    {
      key: 'packing_slip_no',
      label: 'Packing Slip',
      render: (dc) => <span className="stamp">{dc.packing_slip_no || '—'}</span>
    },
    {
      key: 'sales_order_no',
      label: 'Sales Order',
      render: (dc) => <span className="stamp">{dc.sales_order_no || '—'}</span>
    },
    {
      key: 'customer_name',
      label: 'Customer',
      render: (dc) => <span className="font-medium text-text-primary">{dc.customer_name}</span>
    },
    {
      key: 'challan_date',
      label: 'Challan Date',
      render: (dc) => <span className="tabular-nums text-text-secondary">{formatDate(dc.challan_date)}</span>
    },
    {
      key: 'status',
      label: 'Status',
      render: (dc) => <StatusBadge status={dc.status} />
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
        <div className="flex gap-1.5 justify-center">
          <button
            onClick={() => handlePrintPreview(dc.id)}
            className="btn-secondary btn-xs"
          >
            Print
          </button>
          {dc.status === 'Draft' && (
            <button
              onClick={() => handleOpenTransport(dc)}
              className="btn-primary btn-xs"
            >
              Dispatch
            </button>
          )}
          {dc.status === 'Dispatched' && (
            <button
              onClick={() => handleOpenPod(dc.id)}
              className="btn-secondary btn-xs text-[var(--success-text)] hover:border-[var(--success-border)]"
            >
              Confirm Del.
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-5 animate-fadeIn">
      <PageHeader
        title="Delivery Challans"
        description="Generate challans, add transport logs, and upload POD confirmations."
        actions={
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            + Create Delivery Challan
          </button>
        }
      />

      {error && <div className="rounded-md border px-3 py-2 text-sm border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-text)]">{error}</div>}
      {success && <div className="rounded-md border px-3 py-2 text-sm border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-text)]">{success}</div>}

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
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Select Packing Slip *</label>
            <select
              value={selectedPackingSlipId}
              onChange={(e) => setSelectedPackingSlipId(e.target.value)}
              className="field"
              required
            >
              <option value="">-- Select Packing Slip --</option>
              {packingSlips.map(ps => (
                <option key={ps.id} value={ps.id}>{ps.packing_slip_no} ({ps.customer_name})</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border-color">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
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
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Transporter Name *</label>
            <input
              type="text"
              value={transporterName}
              onChange={(e) => setTransporterName(e.target.value)}
              className="field"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Vehicle No *</label>
            <input
              type="text"
              value={vehicleNo}
              onChange={(e) => setVehicleNo(e.target.value)}
              className="field"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">LR / Docket Number</label>
            <input
              type="text"
              value={lrNumber}
              onChange={(e) => setLrNumber(e.target.value)}
              className="field"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Dispatch Date</label>
            <input
              type="date"
              value={dispatchDate}
              onChange={(e) => setDispatchDate(e.target.value)}
              className="field"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border-color">
            <button
              type="button"
              onClick={() => setShowTransportModal(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
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
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Received By (Name) *</label>
            <input
              type="text"
              value={receivedBy}
              onChange={(e) => setReceivedBy(e.target.value)}
              className="field"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Delivered At Date</label>
            <input
              type="date"
              value={deliveredAt}
              onChange={(e) => setDeliveredAt(e.target.value)}
              className="field"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Upload File (PDF/Image)</label>
            <div className="rounded-lg border border-dashed border-border-color bg-bg-secondary p-4 text-center text-sm text-text-secondary">
              <input
                type="file"
                onChange={(e) => setPodFile(e.target.files[0])}
                className="w-full text-xs text-text-primary focus:outline-none file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-bg-subtle file:text-text-primary hover:file:bg-bg-hover"
                accept=".pdf,.png,.jpg,.jpeg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Remarks</label>
            <textarea
              value={podNotes}
              onChange={(e) => setPodNotes(e.target.value)}
              className="field h-20"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border-color">
            <button
              type="button"
              onClick={() => setShowPodModal(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
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
        size="xl"
      >
        {selectedChallanDetails && (
          <div className="space-y-4">
            {/* Top Action Bar */}
            <div className="sheet p-3 flex flex-wrap justify-between items-center gap-2 no-print">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-text-secondary">Challan status:</span>
                <StatusBadge status={selectedChallanDetails.challan.status} />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTriggerPrint}
                  className="btn btn-primary btn-sm inline-flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> Print / Save PDF
                </button>
                <a
                  href={`/print/challan/${selectedChallanDetails.challan.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost btn-sm inline-flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Full page
                </a>
              </div>
            </div>

            {/* Document Frame */}
            <div id="printable-challan" className="printable-document bg-white text-slate-900 border border-slate-300 rounded-lg p-6 sm:p-8 shadow-sm space-y-6 print:border-none print:shadow-none print:p-0 print:m-0 print:rounded-none">
              {/* Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start pb-5 border-b-2 border-slate-800 gap-4">
                <div className="flex items-start gap-3.5">
                  <img
                    src="/logo.svg"
                    alt="ERP Nexus Logo"
                    className="h-12 w-12 object-contain rounded mt-0.5"
                  />
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-slate-900 uppercase">{COMPANY_NAME}</h2>
                    <p className="text-xs text-slate-600 mt-0.5 max-w-md leading-relaxed">{COMPANY_ADDRESS}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-600 mt-1 font-mono">
                      <span><strong className="text-slate-800 font-sans font-medium">GSTIN:</strong> {COMPANY_GSTIN}</span>
                      <span><strong className="text-slate-800 font-sans font-medium">PAN:</strong> {COMPANY_PAN}</span>
                      <span><strong className="text-slate-800 font-sans font-medium">State:</strong> {COMPANY_STATE}</span>
                    </div>
                  </div>
                </div>

                <div className="text-left sm:text-right border-2 border-slate-800 rounded bg-slate-50 px-3.5 py-2.5 text-xs min-w-[230px]">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Official Dispatch / Transit
                  </div>
                  <div className="text-base font-bold text-slate-900 tracking-tight">
                    DELIVERY CHALLAN
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-300 space-y-1">
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Challan No:</span>
                      <span className="font-mono font-bold text-slate-900">{selectedChallanDetails.challan.challan_no}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Challan Date:</span>
                      <span className="font-mono text-slate-800">{formatDate(selectedChallanDetails.challan.challan_date)}</span>
                    </div>
                    {selectedChallanDetails.challan.packing_slip_no && (
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Packing Slip:</span>
                        <span className="font-mono text-slate-800">{selectedChallanDetails.challan.packing_slip_no}</span>
                      </div>
                    )}
                    {selectedChallanDetails.challan.sales_order_no && (
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Sales Order:</span>
                        <span className="font-mono text-blue-700 font-semibold">{selectedChallanDetails.challan.sales_order_no}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Consignee and Logistics Matrix */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Consignee Card */}
                <div className="border border-slate-300 rounded-lg p-3.5 bg-slate-50/60">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1 mb-2">
                    Consignee / Deliver To
                  </div>
                  <div className="space-y-1 text-xs text-slate-700">
                    <p className="font-bold text-slate-900 text-sm">{selectedChallanDetails.challan.customer_name}</p>
                    {selectedChallanDetails.challan.customer_address && (
                      <p className="whitespace-pre-line leading-relaxed text-slate-600">
                        {selectedChallanDetails.challan.customer_address}
                      </p>
                    )}
                    <div className="pt-1 space-y-0.5 font-mono text-[11px] text-slate-600">
                      <p><strong className="font-sans font-medium text-slate-700">GSTIN:</strong> {selectedChallanDetails.challan.customer_gstin || 'Unregistered / N/A'}</p>
                      {selectedChallanDetails.challan.customer_email && (
                        <p><strong className="font-sans font-medium text-slate-700">Email:</strong> {selectedChallanDetails.challan.customer_email}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Transport & Dispatch Details */}
                <div className="border border-slate-300 rounded-lg p-3.5 bg-slate-50/60">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1 mb-2">
                    Transport & Logistics Particulars
                  </div>
                  {selectedChallanDetails.transport ? (
                    <div className="space-y-1 text-xs text-slate-700">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Transporter:</span>
                        <span className="font-semibold text-slate-900">{selectedChallanDetails.transport.transporter_name || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Vehicle Number:</span>
                        <span className="font-mono font-semibold text-slate-900">{selectedChallanDetails.transport.vehicle_no || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">LR / Docket No:</span>
                        <span className="font-mono text-slate-900">{selectedChallanDetails.transport.lr_number || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Dispatch Date:</span>
                        <span className="font-mono text-slate-800">{formatDate(selectedChallanDetails.transport.dispatch_date)}</span>
                      </div>
                      {selectedChallanDetails.pod?.received_by && (
                        <div className="flex justify-between pt-1 border-t border-slate-200 text-emerald-700 font-medium">
                          <span>Delivered To:</span>
                          <span>{selectedChallanDetails.pod.received_by} ({formatDate(selectedChallanDetails.pod.delivered_at)})</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-4 text-center text-xs text-slate-400 italic">
                      Transport & vehicle allocation pending dispatch confirmation
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse border border-slate-300 text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-semibold border-b border-slate-300">
                      <th className="p-2.5 border border-slate-300 w-10 text-center">#</th>
                      <th className="p-2.5 border border-slate-300 w-28">Item Code</th>
                      <th className="p-2.5 border border-slate-300">Item Description</th>
                      <th className="p-2.5 border border-slate-300 w-32">Batch / Lot No</th>
                      <th className="p-2.5 border border-slate-300 w-28 text-right">Dispatched Qty</th>
                      <th className="p-2.5 border border-slate-300 w-20 text-center">Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300 text-slate-700">
                    {selectedChallanDetails.items.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50/50">
                        <td className="p-2.5 border border-slate-300 text-center text-slate-500 tabular-nums">{idx + 1}</td>
                        <td className="p-2.5 border border-slate-300 font-mono font-medium text-slate-900">{item.item_code || '—'}</td>
                        <td className="p-2.5 border border-slate-300 font-medium text-slate-900">{item.item_name}</td>
                        <td className="p-2.5 border border-slate-300 font-mono text-xs">{item.batch_no || '—'}</td>
                        <td className="p-2.5 border border-slate-300 text-right font-bold font-mono text-slate-900 tabular-nums">
                          {formatQty(item.qty)}
                        </td>
                        <td className="p-2.5 border border-slate-300 text-center text-slate-600">{item.unit || 'Units'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-bold border-t-2 border-slate-300 text-slate-900">
                      <td colSpan={4} className="p-2.5 border border-slate-300 text-right uppercase tracking-wider text-[11px] text-slate-600">
                        Total Quantity Dispatched:
                      </td>
                      <td className="p-2.5 border border-slate-300 text-right font-mono text-sm tabular-nums text-blue-700">
                        {formatQty(selectedChallanDetails.items.reduce((sum, it) => sum + (parseFloat(it.qty) || 0), 0))}
                      </td>
                      <td className="p-2.5 border border-slate-300 text-center text-xs text-slate-600">
                        {selectedChallanDetails.items[0]?.unit || 'Units'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Statutory Note & Dual Signatures */}
              <div className="pt-2 space-y-6">
                <div className="p-3 rounded bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
                  <strong className="text-slate-800">Dispatch Declaration:</strong> This Delivery Challan is issued under relevant GST transit rules for delivery/transport of goods. The receiver acknowledges that goods described above have been checked and received intact in good condition.
                </div>

                <div className="grid grid-cols-2 gap-8 pt-8">
                  <div className="text-left border-t border-slate-400 pt-2">
                    <p className="text-xs font-semibold text-slate-800">Receiver's Signature & Company Stamp</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Name, Date & Contact Number</p>
                  </div>
                  <div className="text-right border-t border-slate-400 pt-2">
                    <p className="text-xs font-semibold text-slate-800">For {COMPANY_NAME}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Authorized Dispatch Signatory / Warehouse In-Charge</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t border-border-color no-print">
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="btn btn-secondary"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleTriggerPrint}
                className="btn btn-primary inline-flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Print Challan
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}