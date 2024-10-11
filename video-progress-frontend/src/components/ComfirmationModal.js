import React from "react";

const ConfirmationModal = ({ isOpen, onClose, onConfirm, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-colorsecondary p-6 rounded shadow-lg max-w-sm w-full">
        <h2 className="text-colortext mb-4 font-extrabold">Confirm Action</h2>
        <p className="text-colortext mb-6 text-sm">{message}</p>
        <div className="flex justify-end space-x-1 text-sm">
          <button
            className="text-colortextsecondary hover:text-colortext px-4 py-1.5 font-medium transition-colors transform duration-200 ease-in-out"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="text-colortext px-4 py-1.5 font-medium bg-gradient-to-r from-gradientStart to-gradientEnd rounded-sm transition-transform transform duration-200 hover:scale-105 ease-in-out"
            onClick={onConfirm}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
