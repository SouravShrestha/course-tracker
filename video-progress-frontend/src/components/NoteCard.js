import React, { useState, forwardRef } from "react";
import ConfirmationModal from "./ComfirmationModal";

const NoteCard = forwardRef(({ note, reloadNotes, isLast }, ref) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleDelete = async () => {

    try {
      const response = await fetch(
        `http://localhost:8000/api/notes/${note.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete the note.");
      }
      // Optionally reload notes or handle the state update in the parent component
      reloadNotes(); // Call the function to reload notes after deletion
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  };

  const formatDate = (dateString) => {
    const options = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    };
    const date = new Date(dateString);
    return date.toLocaleString(undefined, options); // Formats to local time
  };

  return (
    <div
      ref={ref}
      className={`w-full mb-5 select-text ${
        !isLast ? "border-b border-colorborder" : ""
      }`}
    >
      {/* 1st row: Date and Time */}
      <div className="text-xs text-colortextsecondary">
        {formatDate(note.created_at)}
      </div>

      {/* 2nd row: Actual row */}
      <div
        className="mt-4"
        dangerouslySetInnerHTML={{ __html: note.content.trim() }} // Render note as HTML
      />

      {/* 3rd row: Edit and Delete buttons */}
      <div className="my-4 flex space-x-4 text-xs select-none text-colortextsecondary">
        <button
          className="cursor-pointer hover:text-gradientStart"
          onClick={() => setIsModalOpen(true)}
        >
          Delete
        </button>
      </div>
      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={() => {
          handleDelete();
          setIsModalOpen(false);
        }}
        message={`🗑️ Are you sure you want to delete this note?`}
      />
    </div>
  );
});

export default NoteCard;
