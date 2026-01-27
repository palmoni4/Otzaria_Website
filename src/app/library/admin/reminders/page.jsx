'use client';

import { useState } from 'react';

export default function SendEmailPage() {
    const [formData, setFormData] = useState({
        to: '',
        subject: '',
        text: ''
    });

    const [status, setStatus] = useState({
        loading: false,
        error: '',
        success: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus({ loading: true, error: '', success: '' });

        try {
            const response = await fetch('/api/admin/send-email', { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    to: formData.to,
                    subject: formData.subject,
                    text: formData.text,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'שגיאה בשליחת המייל');
            }

            setStatus({ loading: false, error: '', success: 'המייל נשלח בהצלחה!' });
            setFormData({ to: '', subject: '', text: '' });

        } catch (error) {
            setStatus({ loading: false, error: error.message, success: '' });
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-6 bg-white shadow-md rounded-lg mt-10">
            <h1 className="text-2xl font-bold mb-6 text-gray-800">שליחת מייל למשתמשים</h1>
            
            <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* שדה כתובת מייל */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">כתובת נמען (To)</label>
                    <input
                        type="email"
                        name="to"
                        required
                        value={formData.to}
                        onChange={handleChange}
                        placeholder="example@gmail.com"
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>

                {/* שדה נושא */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">נושא (Subject)</label>
                    <input
                        type="text"
                        name="subject"
                        required
                        value={formData.subject}
                        onChange={handleChange}
                        placeholder="נושא ההודעה..."
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>

                {/* שדה תוכן */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">תוכן ההודעה (Text)</label>
                    <textarea
                        name="text"
                        required
                        rows="6"
                        value={formData.text}
                        onChange={handleChange}
                        placeholder="כתוב כאן את תוכן המייל..."
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    ></textarea>
                </div>

                {/* כפתור שליחה */}
                <button
                    type="submit"
                    disabled={status.loading}
                    className={`w-full py-2 px-4 rounded text-white font-bold transition duration-200 
                        ${status.loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                    {status.loading ? 'שולח...' : 'שלח מייל'}
                </button>

                {/* הודעות חיווי */}
                {status.success && (
                    <div className="p-3 bg-green-100 text-green-700 rounded border border-green-200">
                        {status.success}
                    </div>
                )}
                
                {status.error && (
                    <div className="p-3 bg-red-100 text-red-700 rounded border border-red-200">
                        שגיאה: {status.error}
                    </div>
                )}
            </form>
        </div>
    );
}
