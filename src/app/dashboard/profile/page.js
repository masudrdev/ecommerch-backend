"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import { updateMyProfileApi } from "@/services/profile.service";
import {
  getMyAddressesApi,
  createAddressApi,
  updateAddressApi,
  deleteAddressApi,
} from "@/services/address.service";

const emptyAddress = {
  type: "HOME",
  fullName: "",
  phone: "",
  address: "",
  district: "",
  upazila: "",
  isDefault: false,
};

export default function ProfilePage() {
  const { user } = useSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    phone: "",
    avatar: "",
  });

  const [addresses, setAddresses] = useState([]);
  const [addressForm, setAddressForm] = useState(emptyAddress);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        username: user.username || "",
        email: user.email || "",
        phone: user.phone || "",
        avatar: user.avatar || "",
      });

      setAddressForm((prev) => ({
        ...prev,
        fullName: user.name || "",
        phone: user.phone || "",
      }));
    }

    fetchAddresses();
  }, [user]);

  const fetchAddresses = async () => {
    try {
      const res = await getMyAddressesApi();
      setAddresses(res?.addresses || []);
    } catch (error) {
      console.error("Address fetch error:", error);
      setAddresses([]);
    }
  };

  const handleProfileChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleAddressChange = (e) => {
    const { name, value, type, checked } = e.target;

    setAddressForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      await updateMyProfileApi({
        name: formData.name,
        phone: formData.phone,
        avatar: formData.avatar,
      });

      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Profile update failed");
    } finally {
      setLoading(false);
    }
  };

  const handleAddressSubmit = async (e) => {
    e.preventDefault();

    try {
      setAddressLoading(true);

      if (editingAddressId) {
        await updateAddressApi(editingAddressId, addressForm);
        toast.success("Address updated successfully");
      } else {
        await createAddressApi(addressForm);
        toast.success("Address added successfully");
      }

      setAddressForm(emptyAddress);
      setEditingAddressId(null);
      fetchAddresses();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Address save failed");
    } finally {
      setAddressLoading(false);
    }
  };

  const handleEditAddress = (address) => {
    setEditingAddressId(address.id);
    setAddressForm({
      type: address.type || "HOME",
      fullName: address.fullName || "",
      phone: address.phone || "",
      address: address.address || "",
      district: address.district || "",
      upazila: address.upazila || "",
      isDefault: address.isDefault || false,
    });
  };

  const handleDeleteAddress = async (id) => {
    const confirmDelete = window.confirm("Delete this address?");
    if (!confirmDelete) return;

    try {
      await deleteAddressApi(id);
      toast.success("Address deleted");
      fetchAddresses();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Delete failed");
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">My Profile</h1>
        <p className="mt-1 text-sm text-gray-400">
          Manage profile information and saved addresses.
        </p>
      </div>

      <form
        onSubmit={handleProfileSubmit}
        className="rounded-xl bg-[#1E293B] p-5 shadow-sm"
      >
        <h2 className="mb-4 text-lg font-bold text-white">
          Profile Information
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm text-gray-300">Name</label>
            <input
              name="name"
              value={formData.name}
              onChange={handleProfileChange}
              className="w-full rounded-lg border border-slate-700 bg-[#0F172A] px-4 py-3 text-white outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-300">Phone</label>
            <input
              name="phone"
              value={formData.phone}
              onChange={handleProfileChange}
              className="w-full rounded-lg border border-slate-700 bg-[#0F172A] px-4 py-3 text-white outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-300">
              Username
            </label>
            <input
              value={formData.username}
              disabled
              className="w-full cursor-not-allowed rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-gray-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-300">Email</label>
            <input
              value={formData.email}
              disabled
              className="w-full cursor-not-allowed rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-gray-400"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm text-gray-300">
              Avatar URL
            </label>
            <input
              name="avatar"
              value={formData.avatar}
              onChange={handleProfileChange}
              placeholder="https://example.com/avatar.jpg"
              className="w-full rounded-lg border border-slate-700 bg-[#0F172A] px-4 py-3 text-white outline-none focus:border-orange-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-5 rounded-lg bg-orange-500 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
        >
          {loading ? "Updating..." : "Update Profile"}
        </button>
      </form>

      <div className="grid gap-6 lg:grid-cols-2">
        <form
          onSubmit={handleAddressSubmit}
          className="rounded-xl bg-[#1E293B] p-5 shadow-sm"
        >
          <h2 className="mb-4 text-lg font-bold text-white">
            {editingAddressId ? "Edit Address" : "Add Address"}
          </h2>

          <div className="space-y-4">
            <select
              name="type"
              value={addressForm.type}
              onChange={handleAddressChange}
              className="w-full rounded-lg border border-slate-700 bg-[#0F172A] px-4 py-3 text-white outline-none focus:border-orange-500"
            >
              <option value="HOME">Home</option>
              <option value="OFFICE">Office</option>
              <option value="OTHER">Other</option>
            </select>

            <input
              name="fullName"
              value={addressForm.fullName}
              onChange={handleAddressChange}
              placeholder="Full name"
              className="w-full rounded-lg border border-slate-700 bg-[#0F172A] px-4 py-3 text-white outline-none focus:border-orange-500"
            />

            <input
              name="phone"
              value={addressForm.phone}
              onChange={handleAddressChange}
              placeholder="Phone"
              className="w-full rounded-lg border border-slate-700 bg-[#0F172A] px-4 py-3 text-white outline-none focus:border-orange-500"
            />

            <textarea
              name="address"
              value={addressForm.address}
              onChange={handleAddressChange}
              placeholder="Address"
              rows={3}
              className="w-full rounded-lg border border-slate-700 bg-[#0F172A] px-4 py-3 text-white outline-none focus:border-orange-500"
            />

            <div className="grid gap-4 md:grid-cols-2">
              <input
                name="district"
                value={addressForm.district}
                onChange={handleAddressChange}
                placeholder="District"
                className="w-full rounded-lg border border-slate-700 bg-[#0F172A] px-4 py-3 text-white outline-none focus:border-orange-500"
              />

              <input
                name="upazila"
                value={addressForm.upazila}
                onChange={handleAddressChange}
                placeholder="Upazila"
                className="w-full rounded-lg border border-slate-700 bg-[#0F172A] px-4 py-3 text-white outline-none focus:border-orange-500"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                name="isDefault"
                checked={addressForm.isDefault}
                onChange={handleAddressChange}
              />
              Set as default address
            </label>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={addressLoading}
                className="rounded-lg bg-orange-500 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
              >
                {addressLoading
                  ? "Saving..."
                  : editingAddressId
                  ? "Update Address"
                  : "Add Address"}
              </button>

              {editingAddressId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingAddressId(null);
                    setAddressForm(emptyAddress);
                  }}
                  className="rounded-lg bg-slate-700 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-600"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </form>

        <div className="rounded-xl bg-[#1E293B] p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-white">Saved Addresses</h2>

          {addresses.length === 0 ? (
            <div className="rounded-lg bg-[#334155] p-5 text-sm text-gray-300">
              No address found.
            </div>
          ) : (
            <div className="space-y-4">
              {addresses.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-slate-700 bg-[#0F172A] p-4"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-400">
                      {item.type}
                    </span>

                    {item.isDefault && (
                      <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-400">
                        Default
                      </span>
                    )}
                  </div>

                  <h3 className="font-semibold text-white">{item.fullName}</h3>
                  <p className="mt-1 text-sm text-gray-300">{item.phone}</p>
                  <p className="mt-2 text-sm text-gray-400">
                    {item.address}, {item.upazila}, {item.district}
                  </p>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => handleEditAddress(item)}
                      className="rounded-lg bg-blue-500 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-600"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => handleDeleteAddress(item.id)}
                      className="rounded-lg bg-red-500 px-3 py-2 text-xs font-semibold text-white hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}