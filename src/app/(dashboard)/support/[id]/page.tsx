'use client';

import { use, useEffect, useState } from 'react';
import { supportApi } from '@/lib/api/support';
import { CommentRequestType, Ticket, TicketCriticality, TicketValidationDecision } from '@/lib/api/types';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { can } from '@/lib/auth/rbac';
import { TicketAttachmentUpload } from '@/components/support/TicketAttachmentUpload';
import { BackButton } from '@/components/ui/back-button';

const STATUS_LABELS: Record<string, string> = {
  NEW: 'Nouveau',
  AWAITING_SUPPLIER: 'En attente fournisseur',
  DIAGNOSING: 'Diagnostic en cours',
  SOLUTION_PROPOSED: 'Solution proposée',
  INTERVENING: 'Intervention en cours',
  RESOLVED: 'Résolu',
  CLOSED: 'Clôturé',
};

const REQUEST_TYPE_LABELS: Record<string, string> = {
  QUESTION: '❓ Question',
  TEST_REQUEST: '🧪 Essai demandé',
  PHOTO_REQUEST: '📷 Photos demandées',
};

// Explains what's happening / whose turn it is at each status, so a role
// with no available action on the current status (e.g. an admin right
// after assigning to the supplier) doesn't just see an empty gap where a
// button used to be and assume something broke.
function getStatusHelp(status: string, isSupplier: boolean): string | null {
  if (isSupplier) {
    switch (status) {
      case 'NEW': return "Ce ticket n'est pas encore assigné à votre société.";
      case 'AWAITING_SUPPLIER': return 'Ticket assigné — vous pouvez démarrer le diagnostic ou proposer directement une solution.';
      case 'DIAGNOSING': return 'Diagnostic en cours de votre côté — proposez une solution ci-dessous quand elle est prête.';
      case 'SOLUTION_PROPOSED': return "Votre solution a été envoyée à l'usine. En attente de leur validation.";
      case 'INTERVENING': return "Solution acceptée — intervention en cours de traitement par l'usine.";
      case 'RESOLVED': return "L'usine a marqué ce ticket comme résolu.";
      case 'CLOSED': return 'Ce ticket est clôturé.';
    }
  } else {
    switch (status) {
      case 'NEW': return 'Ticket créé — assignez-le au fournisseur pour lancer le traitement.';
      case 'AWAITING_SUPPLIER': return 'En attente du diagnostic du fournisseur.';
      case 'DIAGNOSING': return 'Le fournisseur diagnostique le problème.';
      case 'SOLUTION_PROPOSED': return 'Le fournisseur a proposé une solution — validez-la ci-dessous.';
      case 'INTERVENING': return "Solution acceptée — intervention en cours. Clôturez le ticket une fois la réparation terminée.";
      case 'RESOLVED': return 'Marqué résolu — clôturez le ticket ci-dessous pour finaliser.';
      case 'CLOSED': return 'Ce ticket est clôturé.';
    }
  }
  return null;
}

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const ticketId = parseInt(id);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comment, setComment] = useState('');
  const [requestType, setRequestType] = useState<CommentRequestType>('');
  const [reasonById, setReasonById] = useState('');
  const user = useAuthStore((state) => state.user);

  // Supplier solution form
  const [diagnostic, setDiagnostic] = useState('');
  const [probableCause, setProbableCause] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [repairProcedure, setRepairProcedure] = useState('');
  const [spareParts, setSpareParts] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');
  const [urgency, setUrgency] = useState<TicketCriticality>('MEDIUM');
  const [justProposedSolutionId, setJustProposedSolutionId] = useState<number | null>(null);

  // Closure form
  const [partsReplaced, setPartsReplaced] = useState('');
  const [interventionMin, setInterventionMin] = useState('');
  const [repairConforms, setRepairConforms] = useState(true);
  const [machineBackInService, setMachineBackInService] = useState(true);
  const [interventionCost, setInterventionCost] = useState('');

  const reload = () => supportApi.getTicket(ticketId).then(setTicket).catch(console.error);
  useEffect(() => { reload(); }, [ticketId]);

  if (!ticket) return <div className="p-6">Chargement...</div>;

  const isSupplier = user?.role === 'SUPPLIER';

  const handleAssignSupplier = () => supportApi.assignSupplier(ticket.id).then(setTicket).catch(console.error);
  const handleStartDiagnosis = () => supportApi.startDiagnosis(ticket.id).then(setTicket).catch(console.error);

  const handleProposeSolution = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await supportApi.proposeSolution(ticket.id, {
        diagnostic,
        probable_cause: probableCause,
        root_cause: rootCause,
        repair_procedure: repairProcedure,
        spare_parts: spareParts,
        estimated_duration_min: estimatedDuration ? parseInt(estimatedDuration) : undefined,
        urgency,
      });
      setTicket(updated);
      setDiagnostic(''); setProbableCause(''); setRootCause(''); setRepairProcedure('');
      setSpareParts(''); setEstimatedDuration(''); setUrgency('MEDIUM');
      // Solutions are ordered newest-first (see SupplierSolution.Meta.ordering),
      // so the one we just created is always the first entry.
      setJustProposedSolutionId(updated.solutions[0]?.id ?? null);
    } catch (e) {
      console.error('Failed to propose solution', e);
    }
  };

  const handleValidate = async (decision: TicketValidationDecision) => {
    if (decision === 'REFUSED' && !reasonById.trim()) {
      alert('Un motif est requis en cas de refus.');
      return;
    }
    try {
      const updated = await supportApi.validate(ticket.id, decision, reasonById);
      setTicket(updated);
      setReasonById('');
    } catch (e) {
      console.error('Validation failed', e);
    }
  };

  const handleClose = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await supportApi.close(ticket.id, {
        repair_conforms: repairConforms,
        machine_back_in_service: machineBackInService,
        intervention_duration_min: interventionMin ? parseInt(interventionMin) : undefined,
        parts_replaced: partsReplaced,
        intervention_cost: interventionCost ? parseFloat(interventionCost) : undefined,
      });
      setTicket(updated);
    } catch (e) {
      console.error('Closing failed', e);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    try {
      await supportApi.addComment(ticket.id, comment, requestType);
      setComment('');
      setRequestType('');
      reload();
    } catch (e) {
      console.error('Failed to add comment', e);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div className="bg-panel border border-border rounded-md overflow-hidden">
        <div className="p-6 border-b border-border bg-cyan-500/10">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
            <div className="flex items-start gap-3">
              <BackButton fallbackHref="/support" />
              <div>
              <h1 className="font-heading font-bold text-2xl text-text">{ticket.ticket_number}</h1>
              <p className="text-text-dim mt-2">{ticket.machine_detail?.name} ({ticket.machine_detail?.code}) — {ticket.criticality}</p>
              {ticket.machine_detail?.serial_number && (
                <p className="text-xs text-text-dim mt-1">N° de série : <span className="font-mono">{ticket.machine_detail.serial_number}</span></p>
              )}
              {ticket.assigned_supplier_name && (
                <p className="text-xs text-text-dim mt-1">Fournisseur : {ticket.assigned_supplier_name}</p>
              )}
              </div>
            </div>
            <span className="font-mono bg-bg px-3 py-1 rounded text-sm text-text-dim">
              {STATUS_LABELS[ticket.status] || ticket.status}
            </span>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {getStatusHelp(ticket.status, isSupplier) && (
            <div className="bg-cyan-500/5 border border-cyan-500/20 rounded p-3 text-sm text-text-dim">
              {getStatusHelp(ticket.status, isSupplier)}
            </div>
          )}

          <div>
            <h3 className="text-xs uppercase tracking-wider text-text-dim font-semibold mb-2">Description</h3>
            <p className="text-sm bg-bg p-4 rounded border border-border whitespace-pre-wrap">{ticket.description}</p>
            {ticket.symptoms && (
              <>
                <h3 className="text-xs uppercase tracking-wider text-text-dim font-semibold mt-4 mb-2">Symptômes</h3>
                <p className="text-sm bg-bg p-4 rounded border border-border whitespace-pre-wrap">{ticket.symptoms}</p>
              </>
            )}
            {ticket.error_code && (
              <p className="text-xs text-text-dim mt-2">Code erreur : <span className="font-mono">{ticket.error_code}</span></p>
            )}
          </div>

          {/* Workflow actions */}
          {((ticket.status === 'NEW' && can(user?.role, 'assign_ticket_supplier')) ||
            (ticket.status === 'AWAITING_SUPPLIER' && isSupplier)) && (
            <div className="flex flex-wrap gap-3 pt-4 border-t border-border">
              {ticket.status === 'NEW' && can(user?.role, 'assign_ticket_supplier') && (
                <button onClick={handleAssignSupplier} className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded text-sm font-medium">
                  Assigner au fournisseur
                </button>
              )}
              {ticket.status === 'AWAITING_SUPPLIER' && isSupplier && (
                <button onClick={handleStartDiagnosis} className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded text-sm font-medium">
                  Démarrer le diagnostic
                </button>
              )}
            </div>
          )}

          {/* Supplier: propose solution */}
          {isSupplier && (ticket.status === 'AWAITING_SUPPLIER' || ticket.status === 'DIAGNOSING') && (
            <form onSubmit={handleProposeSolution} className="space-y-3 pt-4 border-t border-border">
              <h3 className="text-xs uppercase tracking-wider text-text-dim font-semibold">Proposer une solution</h3>
              <textarea placeholder="Diagnostic" value={diagnostic} onChange={e => setDiagnostic(e.target.value)}
                className="w-full bg-bg border border-border rounded p-2 text-sm text-text" rows={2} required />
              <textarea placeholder="Cause probable" value={probableCause} onChange={e => setProbableCause(e.target.value)}
                className="w-full bg-bg border border-border rounded p-2 text-sm text-text" rows={2} />
              <textarea placeholder="Cause racine" value={rootCause} onChange={e => setRootCause(e.target.value)}
                className="w-full bg-bg border border-border rounded p-2 text-sm text-text" rows={2} />
              <textarea placeholder="Procédure de réparation" value={repairProcedure} onChange={e => setRepairProcedure(e.target.value)}
                className="w-full bg-bg border border-border rounded p-2 text-sm text-text" rows={3} />
              <input placeholder="Pièces de rechange nécessaires" value={spareParts} onChange={e => setSpareParts(e.target.value)}
                className="w-full bg-bg border border-border rounded p-2 text-sm text-text" />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" placeholder="Durée estimée (min)" value={estimatedDuration} onChange={e => setEstimatedDuration(e.target.value)}
                  className="w-full bg-bg border border-border rounded p-2 text-sm text-text" />
                <select value={urgency} onChange={e => setUrgency(e.target.value as TicketCriticality)}
                  className="w-full bg-bg border border-border rounded p-2 text-sm text-text">
                  <option value="CRITICAL">🔴 Urgence critique</option>
                  <option value="HIGH">🟠 Urgence élevée</option>
                  <option value="MEDIUM">🟡 Urgence moyenne</option>
                  <option value="LOW">🔵 Urgence faible</option>
                </select>
              </div>
              <button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded text-sm font-medium">
                Envoyer la solution
              </button>
            </form>
          )}

          {/* Supplier: attach technical docs to the solution just sent */}
          {isSupplier && justProposedSolutionId != null && (
            <div className="pt-4 border-t border-border space-y-2">
              <h3 className="text-xs uppercase tracking-wider text-text-dim font-semibold">
                Joindre la documentation technique (notice, plans, vidéo...)
              </h3>
              <TicketAttachmentUpload ticketId={ticket.id} solutionId={justProposedSolutionId} onUploaded={reload} />
            </div>
          )}

          {/* Solutions history */}
          {ticket.solutions.length > 0 && (
            <div className="pt-4 border-t border-border space-y-3">
              <h3 className="text-xs uppercase tracking-wider text-text-dim font-semibold">Solutions proposées</h3>
              {ticket.solutions.map(s => (
                <div key={s.id} className="bg-bg border border-border rounded p-3 text-sm space-y-1">
                  <div className="text-xs text-text-dim">{new Date(s.proposed_at).toLocaleString()} — {s.proposed_by_name} — urgence {s.urgency}</div>
                  {s.diagnostic && <div><span className="text-text-dim">Diagnostic:</span> {s.diagnostic}</div>}
                  {s.probable_cause && <div><span className="text-text-dim">Cause probable:</span> {s.probable_cause}</div>}
                  {s.root_cause && <div><span className="text-text-dim">Cause racine:</span> {s.root_cause}</div>}
                  {s.repair_procedure && <div><span className="text-text-dim">Procédure:</span> {s.repair_procedure}</div>}
                  {s.spare_parts && <div><span className="text-text-dim">Pièces:</span> {s.spare_parts}</div>}
                  {s.estimated_duration_min != null && <div><span className="text-text-dim">Durée estimée:</span> {s.estimated_duration_min} min</div>}
                  {s.attachments && s.attachments.length > 0 && (
                    <div className="pt-1">
                      <span className="text-text-dim">Documents:</span>{' '}
                      {s.attachments.map((a, i) => (
                        <a key={a.id} href={a.file} target="_blank" rel="noreferrer" className="text-cyan-500 hover:text-cyan-400">
                          {i > 0 && ', '}{a.category}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Validation (usine) */}
          {ticket.status === 'SOLUTION_PROPOSED' && can(user?.role, 'validate_ticket') && (
            <div className="pt-4 border-t border-border space-y-3">
              <h3 className="text-xs uppercase tracking-wider text-text-dim font-semibold">Validation de la solution</h3>
              <input placeholder="Motif (requis en cas de refus)" value={reasonById} onChange={e => setReasonById(e.target.value)}
                className="w-full bg-bg border border-border rounded p-2 text-sm text-text" />
              <div className="flex flex-wrap gap-2">
                <button onClick={() => handleValidate('ACCEPTED')} className="bg-green-600 hover:bg-green-500 text-white px-3 py-2 rounded text-sm">Accepter</button>
                <button onClick={() => handleValidate('REFUSED')} className="bg-red-600 hover:bg-red-500 text-white px-3 py-2 rounded text-sm">Refuser</button>
                <button onClick={() => handleValidate('INFO_REQUESTED')} className="bg-panel-2 hover:bg-panel-2/70 text-text px-3 py-2 rounded text-sm border border-border">Demander des infos</button>
                <button onClick={() => handleValidate('ONSITE_REQUESTED')} className="bg-panel-2 hover:bg-panel-2/70 text-text px-3 py-2 rounded text-sm border border-border">Intervention sur site</button>
                <button onClick={() => handleValidate('VIDEOCALL_REQUESTED')} className="bg-panel-2 hover:bg-panel-2/70 text-text px-3 py-2 rounded text-sm border border-border">Visioconférence</button>
              </div>
            </div>
          )}

          {/* Closure (usine) */}
          {(ticket.status === 'RESOLVED' || ticket.status === 'INTERVENING') && can(user?.role, 'close_ticket') && (
            <form onSubmit={handleClose} className="space-y-3 pt-4 border-t border-border">
              <h3 className="text-xs uppercase tracking-wider text-text-dim font-semibold">Clôture du ticket</h3>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={repairConforms} onChange={e => setRepairConforms(e.target.checked)} />
                La réparation est conforme
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={machineBackInService} onChange={e => setMachineBackInService(e.target.checked)} />
                La machine est remise en service
              </label>
              <input placeholder="Pièces remplacées" value={partsReplaced} onChange={e => setPartsReplaced(e.target.value)}
                className="w-full bg-bg border border-border rounded p-2 text-sm text-text" />
              <input type="number" placeholder="Durée d'intervention (min)" value={interventionMin} onChange={e => setInterventionMin(e.target.value)}
                className="w-full bg-bg border border-border rounded p-2 text-sm text-text" />
              <input type="number" step="0.01" placeholder="Coût de l'intervention" value={interventionCost} onChange={e => setInterventionCost(e.target.value)}
                className="w-full bg-bg border border-border rounded p-2 text-sm text-text" />
              <button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded text-sm font-medium">
                Clôturer le ticket
              </button>
            </form>
          )}

          {ticket.closure && (
            <div className="pt-4 border-t border-border text-sm space-y-1">
              <h3 className="text-xs uppercase tracking-wider text-text-dim font-semibold mb-2">Clôture</h3>
              <div>Temps d'arrêt total : {ticket.closure.total_downtime_min} min</div>
              {ticket.closure.parts_replaced && <div>Pièces remplacées : {ticket.closure.parts_replaced}</div>}
              {ticket.closure.intervention_cost != null && <div>Coût de l'intervention : {ticket.closure.intervention_cost}</div>}
              <div>Conforme : {ticket.closure.repair_conforms ? 'Oui' : 'Non'}</div>
              <div>Machine remise en service : {ticket.closure.machine_back_in_service ? 'Oui' : 'Non'}</div>
            </div>
          )}

          {/* Attachments */}
          <div className="pt-4 border-t border-border space-y-3">
            <h3 className="text-xs uppercase tracking-wider text-text-dim font-semibold">Pièces jointes</h3>
            <TicketAttachmentUpload ticketId={ticket.id} onUploaded={reload} />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ticket.attachments.map(a => (
                <a key={a.id} href={a.file} target="_blank" rel="noreferrer"
                   className="block bg-bg border border-border rounded p-2 text-xs text-text-dim hover:border-cyan-500 truncate">
                  {a.category} — {a.uploaded_by_name || '—'}
                </a>
              ))}
              {ticket.attachments.length === 0 && (
                <span className="text-xs text-text-dim">Aucune pièce jointe pour le moment.</span>
              )}
            </div>
          </div>

          {/* Comments */}
          <div className="pt-4 border-t border-border space-y-3">
            <h3 className="text-xs uppercase tracking-wider text-text-dim font-semibold">Commentaires</h3>
            <div className="space-y-2">
              {ticket.comments.map(c => (
                <div key={c.id} className="bg-bg border border-border rounded p-2 text-sm">
                  <div className="text-xs text-text-dim flex items-center gap-2">
                    <span>{c.user_name} — {new Date(c.created_at).toLocaleString()}</span>
                    {c.request_type && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-500">
                        {REQUEST_TYPE_LABELS[c.request_type] || c.request_type}
                      </span>
                    )}
                  </div>
                  <div>{c.text}</div>
                </div>
              ))}
            </div>
            <form onSubmit={handleAddComment} className="flex flex-col sm:flex-row gap-2">
              <input value={comment} onChange={e => setComment(e.target.value)} placeholder="Ajouter un commentaire..."
                className="flex-1 bg-bg border border-border rounded p-2 text-sm text-text" />
              {isSupplier && (
                <select value={requestType} onChange={e => setRequestType(e.target.value as CommentRequestType)}
                  className="bg-bg border border-border rounded p-2 text-sm text-text">
                  <option value="">Commentaire simple</option>
                  <option value="QUESTION">❓ Poser une question</option>
                  <option value="TEST_REQUEST">🧪 Demander un essai</option>
                  <option value="PHOTO_REQUEST">📷 Demander des photos</option>
                </select>
              )}
              <button type="submit" className="bg-panel-2 hover:bg-panel-2/70 border border-border text-text px-4 py-2 rounded text-sm">
                Envoyer
              </button>
            </form>
          </div>

          {/* Status history */}
          <div className="pt-4 border-t border-border">
            <h3 className="text-xs uppercase tracking-wider text-text-dim font-semibold mb-2">Historique</h3>
            <div className="space-y-1 text-xs text-text-dim">
              {ticket.status_logs.map(log => (
                <div key={log.id}>
                  {new Date(log.created_at).toLocaleString()} — {log.from_status || '—'} → {log.to_status}
                  {log.decision && ` (${log.decision})`} {log.changed_by_name && `par ${log.changed_by_name}`}
                  {log.reason && `: ${log.reason}`}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
