import { useEffect, useState } from 'react';
import { FiMail } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { contactMessageAPI } from '../../services/api';
import { SuperAdminPageWrapper } from './SuperAdminLayout';

export default function SuperAdminContactMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    contactMessageAPI.getAll({ limit: 100 })
      .then((response) => setMessages(response.data?.messages || []))
      .catch((error) => toast.error(error.response?.data?.message || 'Could not load contact messages.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <SuperAdminPageWrapper title="Contact Messages" subtitle="Messages submitted through the public Contact page">
      {loading ? (
        <p className="p-8 text-center text-sm text-gray-500">Loading messages...</p>
      ) : messages.length === 0 ? (
        <div className="p-10 text-center text-gray-500">
          <FiMail className="mx-auto mb-3 h-9 w-9 text-gray-300" />
          <p>No contact messages yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                {['Received', 'Name', 'Email', 'Phone', 'Subject', 'Message'].map((heading) => (
                  <th key={heading} className="px-4 py-3 font-medium">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {messages.map((message) => (
                <tr key={message._id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-4 text-xs text-gray-500">
                    {new Date(message.createdAt).toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-4 text-sm font-medium text-gray-900">{message.name}</td>
                  <td className="px-4 py-4 text-sm text-gray-700">{message.email}</td>
                  <td className="px-4 py-4 text-sm text-gray-700">{message.phone || '—'}</td>
                  <td className="px-4 py-4 text-sm text-gray-700">{message.subject || '—'}</td>
                  <td className="max-w-md whitespace-pre-wrap px-4 py-4 text-sm text-gray-700">{message.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SuperAdminPageWrapper>
  );
}
