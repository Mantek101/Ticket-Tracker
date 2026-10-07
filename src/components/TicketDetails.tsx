import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft, Send, Upload, Paperclip, Download,
  FileText, Image, Clock, User
} from 'lucide-react';

interface TicketDetailsProps {
  ticketId: string;
  onBack: () => void;
}

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  due_date: string;
  assigned_to: string;
  created_at: string;
}

interface Note {
  id: string;
  ticket_id: string;
  user_email: string;
  note_text: string;
  created_at: string;
}

interface Attachment {
  name: string;
  path: string;
  created_at: string;
}

export default function TicketDetails({ ticketId, onBack }: TicketDetailsProps) {
  const { profile } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [newNote, setNewNote] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTicket();
    fetchNotes();
    fetchAttachments();
  }, [ticketId]);

  async function fetchTicket() {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (!error && data) {
      setTicket(data);
    }
    setLoading(false);
  }

  async function fetchNotes() {
    const { data, error } = await supabase
      .from('ticket_notes')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setNotes(data);
    }
  }

  async function fetchAttachments() {
    const { data, error } = await supabase.storage
      .from('attachments')
      .list(`ticket-${ticketId}`);

    if (!error && data) {
      setAttachments(
        data.map((file) => ({
          name: file.name,
          path: `ticket-${ticketId}/${file.name}`,
          created_at: file.created_at || '',
        }))
      );
    }
  }

  async function handleAddNote() {
    if (!newNote.trim() || !profile) return;

    const { error } = await supabase.from('ticket_notes').insert({
      ticket_id: ticketId,
      user_email: profile.email,
      note_text: newNote.trim(),
    });

    if (!error) {
      setNewNote('');
      fetchNotes();
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    for (const file of Array.from(files)) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `ticket-${ticketId}/${fileName}`;

      const { error } = await supabase.storage
        .from('attachments')
        .upload(filePath, file);

      if (error) {
        console.error('Upload error:', error);
        alert(`Failed to upload ${file.name}: ${error.message}`);
      }
    }

    setUploading(false);
    fetchAttachments();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function getDownloadUrl(path: string) {
    const { data } = supabase.storage.from('attachments').getPublicUrl(path);
    return data.publicUrl;
  }

  function getFileIcon(name: string) {
    const ext = name.split('.').pop()?.toLowerCase();
    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '')) {
      return <Image className="w-5 h-5 text-purple-500" />;
    }
    if (ext === 'pdf') {
      return <FileText className="w-5 h-5 text-red-500" />;
    }
    return <FileText className="w-5 h-5 text-gray-500" />;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'overdue': return 'bg-red-100 text-red-700 border-red-200';
      case 'open': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'in_progress': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'closed': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <svg className="animate-spin w-8 h-8 text-blue-600" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Ticket not found.</p>
        <button onClick={onBack} className="mt-4 text-blue-600 hover:underline">Go back</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button & Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{ticket.title}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(ticket.status)}`}>
              {ticket.status.replace('_', ' ')}
            </span>
            <span className="text-sm text-gray-500">Due: {ticket.due_date}</span>
            <span className="text-sm text-gray-500">Assigned: {ticket.assigned_to}</span>
          </div>
        </div>
      </div>

      {/* Description */}
      {ticket.description && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
          <p className="text-gray-600 text-sm whitespace-pre-wrap">{ticket.description}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notes Section */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              Notes Log
            </h3>
          </div>

          {/* Notes timeline */}
          <div className="p-5 max-h-96 overflow-y-auto space-y-4">
            {notes.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No notes yet. Add the first one below.</p>
            ) : (
              notes.map((note) => (
                <div key={note.id} className="flex gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-800">{note.user_email}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(note.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                      {note.note_text}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add note input */}
          <div className="px-5 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex gap-2">
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                placeholder="Type a note..."
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddNote}
                disabled={!newNote.trim()}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg transition"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Attachments Section */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-blue-600" />
              Attachments
            </h3>
          </div>

          {/* Upload area */}
          <div className="p-5">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition"
            >
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 font-medium">Click to upload files</p>
              <p className="text-xs text-gray-400 mt-1">PNG, JPEG, or PDF</p>
              {uploading && (
                <p className="text-xs text-blue-600 mt-2 animate-pulse">Uploading...</p>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.pdf"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {/* File list */}
          <div className="px-5 pb-5">
            {attachments.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-2">No attachments uploaded yet.</p>
            ) : (
              <div className="space-y-2">
                {attachments.map((file) => (
                  <div
                    key={file.path}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100"
                  >
                    {getFileIcon(file.name)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">{file.name}</p>
                      <p className="text-xs text-gray-400">
                        {file.created_at ? new Date(file.created_at).toLocaleString() : ''}
                      </p>
                    </div>
                    <a
                      href={getDownloadUrl(file.path)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
