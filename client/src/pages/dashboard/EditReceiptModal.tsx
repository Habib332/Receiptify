import { useState } from 'react'

type EditableReceiptFields = {
    receiver_name: string
    sender_name: string
    transaction_reference: string
    amount: string
    receipt_date: string
    notes: string
}

type EditReceiptModalProps = {
    initial: EditableReceiptFields
    loading: boolean
    onSave: (data: EditableReceiptFields) => void
    onClose: () => void
}

export default function EditReceiptModal({ initial, loading, onSave, onClose }: EditReceiptModalProps) {
    const [form, setForm] = useState<EditableReceiptFields>(initial)

    const update = (field: keyof EditableReceiptFields) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm((f) => ({ ...f, [field]: e.target.value }))
    }

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6">
                <h3 className="text-base font-bold text-gray-900 mb-1.5">Edit receipt details</h3>
                <p className="text-sm text-gray-500 mb-5">
                    Update the details extracted from this receipt's screenshot.
                </p>

                <div className="space-y-3">
                    <label className="block text-xs text-gray-500">
                        Receiver name
                        <input
                            value={form.receiver_name}
                            onChange={update('receiver_name')}
                            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                        />
                    </label>
                    <label className="block text-xs text-gray-500">
                        Sender name
                        <input
                            value={form.sender_name}
                            onChange={update('sender_name')}
                            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                        />
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <label className="block text-xs text-gray-500">
                            Amount
                            <input
                                type="number"
                                value={form.amount}
                                onChange={update('amount')}
                                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                            />
                        </label>
                        <label className="block text-xs text-gray-500">
                            Date
                            <input
                                type="date"
                                value={form.receipt_date}
                                onChange={update('receipt_date')}
                                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                            />
                        </label>
                    </div>
                    <label className="block text-xs text-gray-500">
                        Transaction reference
                        <input
                            value={form.transaction_reference}
                            onChange={update('transaction_reference')}
                            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                        />
                    </label>
                    <label className="block text-xs text-gray-500">
                        Notes
                        <textarea
                            value={form.notes}
                            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                            rows={2}
                            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 resize-none"
                        />
                    </label>
                </div>

                <div className="flex items-center gap-3 mt-6">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 h-10 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onSave(form)}
                        disabled={loading}
                        className="flex-1 h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Saving...' : 'Save changes'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export type { EditableReceiptFields }