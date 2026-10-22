import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FoodType, QuantityUnit } from '../../types';
import { createFoodListing } from '../../services/firestoreService';
import { uploadListingImage, validateImageFile } from '../../services/storageService';
import {
  CAMPUS_SURPLUS_REFERENCE_PHOTOS,
  getDefaultPhotoForFoodType,
} from '../../constants/foodPhotos';
import {
  X,
  Plus,
  Upload,
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Image as ImageIcon,
  Check,
} from 'lucide-react';

interface CreateListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export const CreateListingModal: React.FC<CreateListingModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const { profile } = useAuth();

  const [foodName, setFoodName] = useState('');
  const [foodType, setFoodType] = useState<FoodType>('Prepared Meals');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState<number>(30);
  const [quantityUnit, setQuantityUnit] = useState<QuantityUnit>('servings');
  const [pickupLocation, setPickupLocation] = useState(
    profile?.contactInformation?.campusBuilding || 'North Commons Kitchen, Staff Entrance Door 3'
  );
  const [storageRequirement, setStorageRequirement] = useState<'Room Temp' | 'Refrigerated' | 'Heated'>('Heated');
  const [hoursUntilDeadline, setHoursUntilDeadline] = useState<number>(4);
  const [dietaryTags, setDietaryTags] = useState<string[]>(['Halal']);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedReferenceUrl, setSelectedReferenceUrl] = useState<string>(
    getDefaultPhotoForFoodType('Prepared Meals')
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    getDefaultPhotoForFoodType('Prepared Meals')
  );
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid image file.');
      return;
    }

    setError(null);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const toggleTag = (tag: string) => {
    setDietaryTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleFoodTypeChange = (newType: FoodType) => {
    setFoodType(newType);
    if (!selectedFile) {
      const defaultRef = getDefaultPhotoForFoodType(newType);
      setSelectedReferenceUrl(defaultRef);
      setPreviewUrl(defaultRef);
    }
  };

  const handleSelectReferencePhoto = (url: string) => {
    setSelectedFile(null);
    setSelectedReferenceUrl(url);
    setPreviewUrl(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setError(null);
    setIsSubmitting(true);

    try {
      let finalImageUrl = selectedReferenceUrl;

      // Upload image to Firebase Storage if custom file selected
      if (selectedFile) {
        finalImageUrl = await uploadListingImage(
          selectedFile,
          profile.uid,
          (progress) => setUploadProgress(progress)
        );
      }

      const now = new Date();
      const deadline = new Date(now.getTime() + hoursUntilDeadline * 60 * 60 * 1000).toISOString();

      await createFoodListing(
        {
          providerId: profile.uid,
          providerName: profile.name,
          foodName,
          foodType,
          description,
          quantity: Number(quantity),
          quantityUnit,
          pickupLocation,
          pickupLatitude: profile.location?.latitude || 37.7749,
          pickupLongitude: profile.location?.longitude || -122.4194,
          preparationTime: now.toISOString(),
          availabilityDeadline: deadline,
          imageUrl: finalImageUrl,
          storageRequirement,
          dietaryInfo: dietaryTags,
          status: 'available',
        },
        profile.email
      );

      if (onCreated) onCreated();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create food listing.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-blue-50/60">
          <div>
            <h3 className="text-base font-bold text-slate-900">Post Surplus Food Listing</h3>
            <p className="text-xs text-slate-500">
              Notify campus pantries, student organizations, and volunteers
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Food Name */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Food Item / Dish Name *
            </label>
            <input
              type="text"
              required
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
              placeholder="e.g. Catered Mediterranean Grain Bowls & Chicken"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-blue-500"
            />
          </div>

          {/* Food Type & Storage */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Food Category</label>
              <select
                value={foodType}
                onChange={(e) => handleFoodTypeChange(e.target.value as FoodType)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-blue-500 bg-white"
              >
                <option value="Prepared Meals">Prepared Meals</option>
                <option value="Produce & Fruit">Produce & Fruit</option>
                <option value="Bakery & Bread">Bakery & Bread</option>
                <option value="Dairy & Refrigerated">Dairy & Refrigerated</option>
                <option value="Packaged & Pantry">Packaged & Pantry</option>
                <option value="Beverages">Beverages</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Storage Condition</label>
              <select
                value={storageRequirement}
                onChange={(e) => setStorageRequirement(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-blue-500 bg-white"
              >
                <option value="Heated">Heated (&gt;140°F safe hot hold)</option>
                <option value="Refrigerated">Refrigerated (&lt;40°F chilled)</option>
                <option value="Room Temp">Room Temp / Dry Store</option>
              </select>
            </div>
          </div>

          {/* Quantity & Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Quantity *</label>
              <input
                type="number"
                min={1}
                required
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Unit</label>
              <select
                value={quantityUnit}
                onChange={(e) => setQuantityUnit(e.target.value as QuantityUnit)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-blue-500 bg-white"
              >
                <option value="servings">servings</option>
                <option value="portions">portions</option>
                <option value="lbs">lbs</option>
                <option value="kg">kg</option>
                <option value="boxes">boxes</option>
              </select>
            </div>
          </div>

          {/* Pickup Location & Urgency Window */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Pickup Location Details *
              </label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  required
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                  placeholder="e.g. North Dining Loading Dock"
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Availability Window
              </label>
              <select
                value={hoursUntilDeadline}
                onChange={(e) => setHoursUntilDeadline(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-blue-500 bg-white"
              >
                <option value={2}>2 Hours (Immediate urgent pickup)</option>
                <option value={4}>4 Hours (Standard dinner window)</option>
                <option value={8}>8 Hours (Same-day end of shift)</option>
                <option value={24}>24 Hours (Next-day bakery / pantry)</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Food Description & Packaging Notes
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Packed in deep catering aluminum trays with lids, labeled with prep timestamp."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-blue-500"
            />
          </div>

          {/* Dietary Tags */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Dietary & Allergen Tags
            </label>
            <div className="flex flex-wrap gap-1.5">
              {['Vegetarian', 'Vegan', 'Halal', 'Gluten-Free', 'Nut-Free', 'Kosher'].map((tag) => {
                const active = dietaryTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                      active
                        ? 'bg-blue-100 text-blue-800 border-blue-300 font-semibold'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Photo Selection: Campus Food Recovery Reference Photos or Custom Upload */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 block">
                Food Image Reference
              </label>
              <span className="text-[10px] text-slate-400">
                Realistic campus catering & donation photos (not hotel plating)
              </span>
            </div>

            {/* Current Active Preview & Custom Upload Bar */}
            <div className="flex items-center gap-4 p-3 rounded-xl border border-slate-200 bg-slate-50/80">
              <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100 shadow-2xs">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                )}
                {selectedFile && (
                  <span className="absolute bottom-1 right-1 bg-blue-600 text-white text-[9px] font-bold px-1 rounded shadow-2xs">
                    Custom
                  </span>
                )}
              </div>

              <div className="flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors">
                    <Upload className="w-3.5 h-3.5 text-blue-600" />
                    <span>Upload Kitchen Photo</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  {selectedFile && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(selectedReferenceUrl);
                      }}
                      className="text-[11px] text-slate-500 hover:text-rose-600 underline cursor-pointer"
                    >
                      Reset to Reference Photo
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-slate-400">
                  {selectedFile
                    ? `Selected: ${selectedFile.name}`
                    : 'Choose an image file or pick a campus reference photo below:'}
                </p>
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="w-full bg-slate-200 rounded-full h-1.5">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Campus Reference Photos Grid */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                Quick Select Campus Reference Photo:
              </span>
              <div className="grid grid-cols-3 gap-2 max-h-44 overflow-y-auto p-1 border border-slate-100 rounded-xl bg-slate-50/50">
                {CAMPUS_SURPLUS_REFERENCE_PHOTOS.map((refPhoto) => {
                  const isSelected = !selectedFile && previewUrl === refPhoto.url;
                  return (
                    <button
                      key={refPhoto.id}
                      type="button"
                      onClick={() => handleSelectReferencePhoto(refPhoto.url)}
                      className={`relative rounded-xl overflow-hidden border text-left p-1.5 transition-all flex flex-col gap-1 bg-white cursor-pointer ${
                        isSelected
                          ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="relative h-14 w-full rounded-lg overflow-hidden bg-slate-100">
                        <img
                          src={refPhoto.url}
                          alt={refPhoto.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        {isSelected && (
                          <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </div>
                      <div className="leading-tight">
                        <span className="text-[10px] font-bold text-slate-800 line-clamp-1 block">
                          {refPhoto.name}
                        </span>
                        <span className="text-[9px] text-slate-400 block truncate">
                          {refPhoto.category}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? 'Publishing to Firestore...' : 'Publish Surplus Food Listing'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
