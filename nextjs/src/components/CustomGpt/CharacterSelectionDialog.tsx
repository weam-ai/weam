'use client';
import React, { useState } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import UploadIcon from '@/icons/UploadIcon';

interface CharacterSelectionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onImageSelect: (imageUrl: string, file?: File) => void;
    currentImage?: string;
}

// Default character images - you can replace these with actual character images later
export const DEFAULT_CHARACTERS = {
    '☁️ Soft': [
        { id: 'soft-1', image: '/soft-1.png' },
        { id: 'soft-2', image: '/soft-2.png' },
        { id: 'soft-3', image: '/soft-3.png' },
        { id: 'soft-4', image: '/soft-4.png' },
        { id: 'soft-5', image: '/soft-5.png' },
        { id: 'soft-6', image: '/soft-6.png' },
        { id: 'soft-7', image: '/soft-7.png' },
        { id: 'soft-8', image: '/soft-8.png' },
        { id: 'soft-9', image: '/soft-9.png' },
        { id: 'soft-10', image: '/soft-10.png' },
        { id: 'soft-11', image: '/soft-11.png' },
        { id: 'soft-12', image: '/soft-12.png' },
        { id: 'soft-13', image: '/soft-13.png' },
        { id: 'soft-14', image: '/soft-14.png' },
        { id: 'soft-15', image: '/soft-15.png' },
        { id: 'soft-16', image: '/soft-16.png' },
        { id: 'soft-17', image: '/soft-17.png' },
        { id: 'soft-18', image: '/soft-18.png' },
    ],
    '🌿 Nature': [
        { id: 'nature-1', image: '/nature-1.png' },
        { id: 'nature-2', image: '/nature-2.png' },
        { id: 'nature-3', image: '/nature-3.png' },
        { id: 'nature-4', image: '/nature-4.png' },
        { id: 'nature-5', image: '/nature-5.png' },
        { id: 'nature-6', image: '/nature-6.png' },
        { id: 'nature-7', image: '/nature-7.png' },
        { id: 'nature-8', image: '/nature-8.png' },
        { id: 'nature-9', image: '/nature-9.png' },
    ],
    '🎨 Vibrant': [
        { id: 'vibrant-1', image: '/vibrant-1.png' },
        { id: 'vibrant-2', image: '/vibrant-2.png' },
        { id: 'vibrant-3', image: '/vibrant-3.png' },
        { id: 'vibrant-4', image: '/vibrant-4.png' },
        { id: 'vibrant-5', image: '/vibrant-5.png' },
        { id: 'vibrant-6', image: '/vibrant-6.png' },
    ],
    '❄️ Cool': [
        { id: 'cool-1', image: '/cool-1.png' },
        { id: 'cool-2', image: '/cool-2.png' },
        { id: 'cool-3', image: '/cool-3.png' },
        { id: 'cool-4', image: '/cool-4.png' },
        { id: 'cool-5', image: '/cool-5.png' },
        { id: 'cool-6', image: '/cool-6.png' },
        { id: 'cool-7', image: '/cool-7.png' },
        { id: 'cool-8', image: '/cool-8.png' },
        { id: 'cool-9', image: '/cool-9.png' },
        { id: 'cool-10', image: '/cool-10.png' },
        { id: 'cool-11', image: '/cool-11.png' },
        { id: 'cool-12', image: '/cool-12.png' },
        { id: 'cool-13', image: '/cool-13.png' },
        { id: 'cool-14', image: '/cool-14.png' },
        { id: 'cool-15', image: '/cool-15.png' },
        { id: 'cool-16', image: '/cool-16.png' },
        { id: 'cool-17', image: '/cool-17.png' },
    ],
    '⛰️ Earth': [
        { id: 'earth-1', image: '/earth-1.png' },
        { id: 'earth-2', image: '/earth-2.png' },
        { id: 'earth-3', image: '/earth-3.png' },
        { id: 'earth-4', image: '/earth-4.png' },
        { id: 'earth-5', image: '/earth-5.png' },
        { id: 'earth-6', image: '/earth-6.png' },
        { id: 'earth-7', image: '/earth-7.png' },
        { id: 'earth-8', image: '/earth-8.png' },
        { id: 'earth-9', image: '/earth-9.png' },
        { id: 'earth-10', image: '/earth-10.png' },
        { id: 'earth-11', image: '/earth-11.png' },
        { id: 'earth-12', image: '/earth-12.png' },
        { id: 'earth-13', image: '/earth-13.png' },
        { id: 'earth-14', image: '/earth-14.png' },
        { id: 'earth-15', image: '/earth-15.png' },
        { id: 'earth-16', image: '/earth-16.png' },
        { id: 'earth-17', image: '/earth-17.png' },
    ],
    '⚡ Electric': [   
        { id: 'electric-1', image: '/electric-1.png' },
        { id: 'electric-2', image: '/electric-2.png' },
        { id: 'electric-3', image: '/electric-3.png' },
        { id: 'electric-4', image: '/electric-4.png' },
        { id: 'electric-5', image: '/electric-5.png' },
        { id: 'electric-6', image: '/electric-6.png' },
        { id: 'electric-7', image: '/electric-7.png' },
        { id: 'electric-8', image: '/electric-8.png' },
        { id: 'electric-9', image: '/electric-9.png' },
        { id: 'electric-10', image: '/electric-10.png' },
        { id: 'electric-11', image: '/electric-11.png' },
        { id: 'electric-12', image: '/electric-12.png' },
        { id: 'electric-13', image: '/electric-13.png' },
        { id: 'electric-14', image: '/electric-14.png' },
        { id: 'electric-15', image: '/electric-15.png' },
        { id: 'electric-16', image: '/electric-16.png' },
        { id: 'electric-17', image: '/electric-17.png' },
        { id: 'electric-18', image: '/electric-18.png' },
    ],
    '🔥 Warm': [   
        { id: 'warm-1', image: '/warm-1.png' },
        { id: 'warm-2', image: '/warm-2.png' },
        { id: 'warm-3', image: '/warm-3.png' },
        { id: 'warm-4', image: '/warm-4.png' },
        { id: 'warm-5', image: '/warm-5.png' },
        { id: 'warm-6', image: '/warm-6.png' },
    ],
    '🌊 Aqua': [   
        { id: 'aqua-1', image: '/aqua-1.png' },
        { id: 'aqua-2', image: '/aqua-2.png' },
        { id: 'aqua-3', image: '/aqua-3.png' },
        { id: 'aqua-4', image: '/aqua-4.png' },
        { id: 'aqua-5', image: '/aqua-5.png' },
        { id: 'aqua-6', image: '/aqua-6.png' },
        { id: 'aqua-7', image: '/aqua-7.png' },
    ],
    
};

const CharacterSelectionDialog: React.FC<CharacterSelectionDialogProps> = ({
    isOpen,
    onClose,
    onImageSelect,
    currentImage
}) => {
    const [selectedCategory, setSelectedCategory] = useState('☁️ Soft');
    const [dragActive, setDragActive] = useState(false);
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);

    const handleCharacterSelect = (character: any) => {
        // Ensure character image has leading slash
        const normalizedImageUrl = character.image.startsWith('/') ? character.image : `/${character.image}`;
        
        // For character selection, we need to create a file-like object
        // This maintains compatibility with the existing system
        const characterFile = new File([], character.id, { type: 'image/jpeg' });
        // Add custom properties to identify this as a character selection
        (characterFile as any).isCharacter = true;
        (characterFile as any).characterImage = normalizedImageUrl;
        (characterFile as any).characterId = character.id;
        // Add the uri property that AgentList expects
        (characterFile as any).uri = normalizedImageUrl;
        
        onImageSelect(normalizedImageUrl, characterFile);
        onClose();
    };

    const handleFileUpload = (file: File) => {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;
                setUploadedImage(result);
                onImageSelect(result, file);
                onClose();
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFileUpload(e.target.files[0]);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="md:max-w-[550px] max-w-[calc(100%-30px)] py-7 md:max-h-[calc(100vh-60px)] max-h-[calc(100vh-100px)] overflow-y-auto">
                <DialogHeader className="rounded-t-10 px-[30px]">
                    <DialogTitle className="font-semibold flex items-center">
                    </DialogTitle>
                </DialogHeader>
                <div className="dialog-body flex flex-col flex-1 relative px-5 h-full ">
                    <Tabs defaultValue="characters" className="w-full">
                        <div className='w-full border-b pb-2'>
                        <TabsList className="flex w-full max-w-[200px] border-none p-0 gap-x-2">
                            <TabsTrigger value="characters" className="rounded-md border px-3 py-1.5 text-font-14 data-[state=active]:border-b10 data-[state=active]:bg-gray-100 ">Characters</TabsTrigger>
                            <TabsTrigger value="upload" className="rounded-md border px-3 py-1.5 text-font-14 data-[state=active]:border-b10 data-[state=active]:bg-gray-100 ">Upload</TabsTrigger>
                        </TabsList>
                        </div>

                        <TabsContent value="characters" className="mt-4">
                            <div className="space-y-4">
                                {/* Category Tabs */}
                                <div className="flex flex-wrap gap-2">
                                    {Object.keys(DEFAULT_CHARACTERS).map((category) => (
                                        <button
                                            key={category}
                                            onClick={() => setSelectedCategory(category)}
                                            className={`px-4 py-2 text-sm font-medium transition-colors ${
                                                selectedCategory === category
                                                    ? 'bg-black text-white border rounded-md px-3 py-2 text-font-14'
                                                    : 'text-b2 bg-white border rounded-md px-3 hover:bg-b12 py-2 text-font-14'
                                            }`}
                                        >
                                            {category}
                                        </button>
                                    ))}
                                </div>

                                {/* Character Grid */}
                                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                                    {DEFAULT_CHARACTERS[selectedCategory as keyof typeof DEFAULT_CHARACTERS]?.map((character) => (
                                        <div
                                            key={character.id}
                                            className="group cursor-pointer"
                                            onClick={() => handleCharacterSelect(character)}
                                        >
                                            <div className="relative mb-3">
                                                <Image
                                                    src={character.image}
                                                    alt='character'
                                                    width={60}
                                                    height={60}
                                                    className="w-16 h-16 object-cover mx-auto"
                                                />
                                                {currentImage === character.image && (
                                                    <div className="absolute inset-0 bg-b8/20 rounded-lg flex items-center justify-center">
                                                        <div className="bg-b2 text-white rounded-full p-1">
                                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                        </div>
                                    ))}
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="upload" className="mt-4">
                            <div className="space-y-4">
                                <div
                                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                                        dragActive
                                            ? 'border-black bg-gray-100'
                                            : 'border-b10 hover:border-b2'
                                    }`}
                                    onDragEnter={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDragOver={handleDrag}
                                    onDrop={handleDrop}
                                >
                                    <Image src="/browse.svg" alt="Upload" width={80} height={80} className="w-20 h-auto object-cover rounded-lg mx-auto" />
                                    <h3 className="text-lg font-medium text-b2 mb-2">
                                    Choose a file or drag & drop it here.
                                    </h3>
                                    <p className="text-b6 mb-4 text-font-14">
                                    JPEG, PNG formats up to 2MB.
                                    </p>
                                    <Button
                                        onClick={() => document.getElementById('file-upload')?.click()}
                                        className="btn btn-outline-black"
                                    >
                                        Browse File
                                    </Button>
                                    <input
                                        id="file-upload"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileInput}
                                        className="hidden"
                                    />
                                </div>
                                
                                {uploadedImage && (
                                    <div className="text-center">
                                        <p className="text-sm text-b6 mb-2">Preview:</p>
                                        <Image
                                            src={uploadedImage}
                                            alt="Uploaded preview"
                                            width={100}
                                            height={100}
                                            className="w-24 h-24 object-cover rounded-lg mx-auto"
                                        />
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default CharacterSelectionDialog;
