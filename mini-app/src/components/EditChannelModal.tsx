import { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2 } from 'lucide-react';
import { Spinner } from '@telegram-apps/telegram-ui';

interface AdFormat {
    id?: number;
    format: string;
    price: number;
    description?: string;
}

interface Channel {
    id: string;
    title: string;
    adFormats?: AdFormat[];
}

interface EditChannelModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (channelId: string, formats: AdFormat[]) => Promise<void>;
    channel: Channel | null;
}

const AVAILABLE_FORMATS = ['POST', 'FORWARD', 'REPOST', 'STORY', 'CUSTOM'];

export default function EditChannelModal({ isOpen, onClose, onSave, channel }: EditChannelModalProps) {
    const [formats, setFormats] = useState<AdFormat[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (channel && channel.adFormats) {
            setFormats(channel.adFormats.map(f => ({
                ...f,
                price: f.price / 1000000000 // Convert nanoTON to TON for display
            })));
        } else {
            setFormats([]);
        }
    }, [channel]);

    const handleAddFormat = () => {
        setFormats([...formats, { format: 'POST', price: 1 }]);
    };

    const handleRemoveFormat = (index: number) => {
        setFormats(formats.filter((_, i) => i !== index));
    };

    const handleChange = (index: number, field: keyof AdFormat, value: any) => {
        const newFormats = [...formats];
        newFormats[index] = { ...newFormats[index], [field]: value };
        setFormats(newFormats);
    };

    const handleSave = async () => {
        if (!channel) return;
        setLoading(true);
        try {
            // Convert TON back to nanoTON
            const formatsToSave = formats.map(f => ({
                ...f,
                price: f.price * 1000000000
            }));
            await onSave(channel.id, formatsToSave);
            onClose();
        } catch (error) {
            console.error('Failed to save:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !channel) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Edit Pricing</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="p-4 overflow-y-auto flex-1">
                    <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{channel.title}</h4>
                        <p className="text-xs text-gray-500">Manage ad formats and pricing (in TON)</p>
                    </div>

                    <div className="space-y-3">
                        {formats.map((format, index) => (
                            <div key={index} className="flex gap-2 items-start bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border dark:border-gray-700">
                                <div className="flex-1 space-y-2">
                                    <select
                                        value={format.format}
                                        onChange={(e) => handleChange(index, 'format', e.target.value)}
                                        className="w-full text-sm p-2 rounded border dark:bg-gray-700 dark:text-white"
                                    >
                                        {AVAILABLE_FORMATS.map(f => (
                                            <option key={f} value={f}>{f}</option>
                                        ))}
                                    </select>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2 text-gray-500 text-xs font-bold">TON</span>
                                        <input
                                            type="number"
                                            value={format.price}
                                            onChange={(e) => handleChange(index, 'price', parseFloat(e.target.value))}
                                            className="w-full text-sm pl-10 pr-2 py-2 rounded border dark:bg-gray-700 dark:text-white"
                                            placeholder="Price"
                                            min="0.1"
                                            step="0.1"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleRemoveFormat(index)}
                                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={handleAddFormat}
                        className="mt-3 w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-colors flex items-center justify-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Add Format
                    </button>
                </div>

                <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="w-full tg-button py-3 rounded-xl flex items-center justify-center gap-2 font-medium shadow-lg shadow-blue-500/20"
                    >
                        {loading ? <Spinner size="s" /> : <Save className="w-4 h-4" />}
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
