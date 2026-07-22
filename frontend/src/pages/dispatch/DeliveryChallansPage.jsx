import React, { useState, useEffect } from 'react';
import {
  getChallans,
  createChallan,
  getChallanById,
  addTransportDetails,
  uploadPOD,
  getPackingSlips
} from '../../api/dispatchApi';

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

  return (
    <div className="p-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">Delivery Challans</h1>
          <p className="text-slate-400 text-sm mt-1">Generate challans, add transport logs, and upload POD confirmations.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 px-4 rounded-lg shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
        >
          <span>+</span> Create Delivery Challan
        </button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-950/80 border border-red-500/50 rounded-lg text-red-200">{error}</div>}
      {success && <div className="mb-4 p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-lg text-emerald-200">{success}</div>}

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden shadow-2xl backdrop-blur-md">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading delivery challans...</div>
        ) : challans.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No delivery challans found. Create one from a packing slip.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/70 text-slate-300 font-semibold text-sm">
                  <th className="p-4">DC No</th>
                  <th className="p-4">Packing Slip</th>
                  <th className="p-4">Sales Order</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Challan Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">POD</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {challans.map((dc) => (
                  <tr key={dc.id} className="hover:bg-slate-800/40 text-slate-300 transition-colors">
                    <td className="p-4 font-mono text-emerald-400 font-medium">{dc.challan_no || 'Pending'}</td>
                    <td className="p-4 font-mono text-slate-400 text-xs">{dc.packing_slip_no || '—'}</td>
                    <td className="p-4">{dc.sales_order_no || '—'}</td>
                    <td className="p-4 font-semibold text-white">{dc.customer_name}</td>
                    <td className="p-4">{new Date(dc.challan_date).toLocaleDateString()}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        dc.status === 'Delivered' ? 'bg-emerald-500/20 text-emerald-300' :
                        dc.status === 'Dispatched' ? 'bg-blue-500/20 text-blue-300' :
                        'bg-amber-500/20 text-amber-300'
                      }`}>
                        {dc.status}
                      </span>
                    </td>
                    <td className="p-4">
                      {dc.pod_file_url ? (
                        <a href={dc.pod_file_url} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline text-xs flex items-center gap-1">
                          ✓ View POD
                        </a>
                      ) : (
                        <span className="text-slate-500 text-xs">Pending</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handlePrintPreview(dc.id)}
                          className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs text-white transition-all"
                        >
                          Print
                        </button>
                        {dc.status === 'Draft' && (
                          <button
                            onClick={() => handleOpenTransport(dc)}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs text-white transition-all"
                          >
                            Dispatch
                          </button>
                        )}
                        {dc.status === 'Dispatched' && (
                          <button
                            onClick={() => handleOpenPod(dc.id)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 rounded text-xs text-white transition-all"
                          >
                            Confirm Del.
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE CHALLAN MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="border-b border-slate-700 p-4 bg-slate-900/50 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">Generate Delivery Challan</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreateChallan} className="p-6 space-y-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-2">Select Packing Slip</label>
                <select
                  value={selectedPackingSlipId}
                  onChange={(e) => setSelectedPackingSlipId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500 transition-all"
                  required
                >
                  <option value="">-- Select Packing Slip --</option>
                  {packingSlips.map(ps => (
                    <option key={ps.id} value={ps.id}>{ps.packing_slip_no} ({ps.customer_name})</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white font-medium"
                >
                  Generate DC
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TRANSPORT MODAL */}
      {showTransportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="border-b border-slate-700 p-4 bg-slate-900/50 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">Add Transport Details</h3>
              <button onClick={() => setShowTransportModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleSaveTransport} className="p-6 space-y-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Transporter Name</label>
                <input
                  type="text"
                  value={transporterName}
                  onChange={(e) => setTransporterName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Vehicle No</label>
                <input
                  type="text"
                  value={vehicleNo}
                  onChange={(e) => setVehicleNo(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">LR / Docket Number</label>
                <input
                  type="text"
                  value={lrNumber}
                  onChange={(e) => setLrNumber(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Dispatch Date</label>
                <input
                  type="date"
                  value={dispatchDate}
                  onChange={(e) => setDispatchDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowTransportModal(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium"
                >
                  Log Dispatch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POD MODAL */}
      {showPodModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="border-b border-slate-700 p-4 bg-slate-900/50 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">Upload Proof of Delivery</h3>
              <button onClick={() => setShowPodModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleUploadPod} className="p-6 space-y-4" encType="multipart/form-data">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Received By (Name)</label>
                <input
                  type="text"
                  value={receivedBy}
                  onChange={(e) => setReceivedBy(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Delivered At Date</label>
                <input
                  type="date"
                  value={deliveredAt}
                  onChange={(e) => setDeliveredAt(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Upload File (PDF/Image)</label>
                <input
                  type="file"
                  onChange={(e) => setPodFile(e.target.files[0])}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none"
                  accept=".pdf,.png,.jpg,.jpeg"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Remarks</label>
                <textarea
                  value={podNotes}
                  onChange={(e) => setPodNotes(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none h-20"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowPodModal(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white font-medium"
                >
                  Submit POD
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT MODAL */}
      {showPrintModal && selectedChallanDetails && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-xl w-full max-w-4xl p-8 shadow-2xl print:p-0 print:shadow-none print:w-full">
            
            {/* Printable Area */}
            <div id="printable-challan" className="space-y-6">
              <div className="flex justify-between items-start border-b-2 border-slate-300 pb-4">
                <div>
                  <h2 className="text-3xl font-extrabold text-slate-800">ERP ENTERPRISE</h2>
                  <p className="text-sm text-slate-500">123 Industrial Area, Block C</p>
                  <p className="text-sm text-slate-500">GSTIN: 27AAAAA0000A1Z5</p>
                </div>
                <div className="text-right">
                  <h3 className="text-xl font-bold text-slate-700">DELIVERY CHALLAN</h3>
                  <p className="text-sm font-mono font-bold mt-1 text-blue-600">{selectedChallanDetails.challan.challan_no}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Date: {new Date(selectedChallanDetails.challan.challan_date).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 bg-slate-50 p-4 rounded-lg">
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Consignee (Deliver To)</h4>
                  <p className="font-bold text-slate-800 mt-1">{selectedChallanDetails.challan.customer_name}</p>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap mt-0.5">{selectedChallanDetails.challan.customer_address}</p>
                  <p className="text-xs text-slate-500 font-mono mt-1">GSTIN: {selectedChallanDetails.challan.customer_gstin || 'N/A'}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Transport & Dispatch Details</h4>
                  {selectedChallanDetails.transport ? (
                    <div className="text-sm text-slate-600 mt-1 space-y-0.5">
                      <p><span className="font-semibold text-slate-700">Transporter:</span> {selectedChallanDetails.transport.transporter_name}</p>
                      <p><span className="font-semibold text-slate-700">Vehicle No:</span> {selectedChallanDetails.transport.vehicle_no}</p>
                      <p><span className="font-semibold text-slate-700">LR / Docket:</span> {selectedChallanDetails.transport.lr_number || '—'}</p>
                      <p><span className="font-semibold text-slate-700">Dispatch Date:</span> {new Date(selectedChallanDetails.transport.dispatch_date).toLocaleDateString()}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 mt-1 italic">Transport info pending</p>
                  )}
                </div>
              </div>

              <div>
                <table className="w-full text-left border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-semibold text-sm border-b border-slate-300">
                      <th className="p-3 border border-slate-300">Item Code</th>
                      <th className="p-3 border border-slate-300">Item Description</th>
                      <th className="p-3 border border-slate-300">Batch No</th>
                      <th className="p-3 border border-slate-300 text-right">Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300 text-slate-700 text-sm">
                    {selectedChallanDetails.items.map((item) => (
                      <tr key={item.id}>
                        <td className="p-3 border border-slate-300 font-mono">{item.item_code}</td>
                        <td className="p-3 border border-slate-300 font-medium">{item.item_name}</td>
                        <td className="p-3 border border-slate-300 font-mono text-xs">{item.batch_no || '—'}</td>
                        <td className="p-3 border border-slate-300 text-right font-semibold">{item.qty} {item.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-end pt-12">
                <div className="w-1/2">
                  <p className="text-xs text-slate-500 italic">Declaration: Material received in good condition and order requirements satisfied.</p>
                </div>
                <div className="text-center w-1/3 border-t border-slate-400 pt-2">
                  <p className="text-xs font-bold text-slate-600">Authorized Signatory</p>
                </div>
              </div>
            </div>

            {/* Print Controls */}
            <div className="flex justify-end gap-3 mt-8 border-t border-slate-200 pt-6 print:hidden">
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg text-slate-700"
              >
                Close
              </button>
              <button
                onClick={handleTriggerPrint}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium"
              >
                Print Challan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
