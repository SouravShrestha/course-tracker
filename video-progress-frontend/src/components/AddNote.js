import React, { useEffect, useRef, useState } from "react";
import sendIcon from "../assets/images/send.png";
import sendDisableIcon from "../assets/images/send-disabled.png";

const AddNote = ({ videoId, reloadNotes, goToNotes }) => {
  const editableRef = useRef(null); // Create a ref for the editable div
  const refSubmitImg = useRef(null);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const updateButtonStates = () => {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const commonAncestor = range.commonAncestorContainer;

      // Check if the selection is within the editable div
      if (editableRef.current && editableRef.current.contains(commonAncestor)) {
        setIsBold(document.queryCommandState("bold"));
        setIsItalic(document.queryCommandState("italic"));
        setIsUnderline(document.queryCommandState("underline"));
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case "b":
            event.preventDefault();
            document.execCommand("bold");
            updateButtonStates();
            break;
          case "i":
            event.preventDefault();
            document.execCommand("italic");
            updateButtonStates();
            break;
          case "u":
            event.preventDefault();
            document.execCommand("underline");
            updateButtonStates();
            break;
          default:
            break;
        }
      }

      if (event.key === "Enter") {
        if (event.shiftKey) {
          // Allow Shift + Enter for new line
          document.execCommand("insertHTML", false, "");
        } else {
          event.preventDefault(); // Prevent default Enter behavior (new line)
          refSubmitImg.current.click(); // Call handleSend to submit the note
        }
      }
    };

    const editableDiv = editableRef.current;
    editableDiv.addEventListener("keydown", handleKeyDown);
    editableDiv.addEventListener("mouseup", updateButtonStates); // Check formatting on mouseup
    editableDiv.addEventListener("keyup", updateButtonStates); // Check formatting on keyup

    return () => {
      editableDiv.removeEventListener("keydown", handleKeyDown);
      editableDiv.removeEventListener("mouseup", updateButtonStates);
      editableDiv.removeEventListener("keyup", updateButtonStates);
    };
  }, []);

  // Function to handle sending the note
  const handleSend = async () => {
    editableRef.current.focus();
    const rawContent = editableRef.current.innerHTML; // Raw HTML content

    // Process the raw HTML to remove unwanted elements
    const content = rawContent
      // Remove <div> containing only <br> tags at the start
      .replace(/^(<div>(<br\s*\/?>)+<\/div>)+/gi, "")
      // Remove <div> containing only <br> tags at the end
      .replace(/(<div>(<br\s*\/?>)+<\/div>)+$/gi, "")
      // Remove any remaining empty <div> tags at the start and end
      .replace(/^(<div><\/div>|<br>)+/gi, "")
      .replace(/(<div><\/div>|<br>)+$/gi, "")
      .trim(); // Trim leading and trailing whitespace

    if (!content) {
      return;
    }

    // Create the payload for the API request
    const payload = {
      content: content,
      video_id: videoId,
    };

    try {
      const response = await fetch(
        `http://localhost:8000/api/videos/${videoId}/notes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      await response.json();

      // Clear the content after sending
      editableRef.current.innerHTML = ""; // Optional: Clear the content after sending
      updateButtonStates(); // Update button states after clearing
      reloadNotes();
      editableRef.current.blur();
      goToNotes();
    } catch (error) {
      console.error("Error updating notes:", error); // Log any errors
    }
  };

  const handleFormatButtonClick = (command) => {
    document.execCommand(command);
    updateButtonStates();

    // Focus back on the editable div
    editableRef.current.focus();
  };

  return (
    <>
      <div
        className={`flex-col items-center mt-4 pt-4 px-2 rounded-sm pb-1 transition-bg ${
          isFocused ? "bg-primarydark" : "bg-colorsecondary"
        }`}
      >
        <div
          contentEditable="true"
          id="editableNote"
          className="w-full px-2 focus:outline-none focus:border-0 text-base placeholder:text-colortextsecondary mb-1 min-h-3"
          placeholder="Add a note"
          onFocus={() => setIsFocused(true)} // Set focus state to true
          onBlur={() => setIsFocused(false)} // Set focus state to false
          ref={editableRef} // Attach ref to the editable div
        />
        {/* Formatting buttons */}
        <div className="w-full h-10 flex justify-between items-center -ml-1">
          <div className="flex font-mono font-medium text-colortextsecondary">
            {/* Bold */}
            <button
              className={`font-extrabold focus:outline-none bg-clip-text px-3 ${
                isBold
                  ? "text-transparent bg-gradient-to-r from-gradientEnd to-gradientStart"
                  : "hover:text-transparent hover:bg-gradient-to-r hover:from-gradientEnd hover:to-gradientStart"
              }`}
              onClick={() => handleFormatButtonClick("bold")}
            >
              B
            </button>
            {/* Italic */}
            <button
              className={`italic focus:outline-none bg-clip-text px-3 ${
                isItalic
                  ? "text-transparent bg-gradient-to-r from-gradientEnd to-gradientStart"
                  : "hover:text-transparent hover:bg-gradient-to-r hover:from-gradientEnd hover:to-gradientStart hover:scale-105"
              }`}
              onClick={() => handleFormatButtonClick("italic")}
            >
              I
            </button>
            {/* Underline */}
            <button
              className={`focus:outline-none underline bg-clip-text px-3 ${
                isUnderline
                  ? "text-transparent bg-gradient-to-r from-gradientEnd to-gradientStart"
                  : "hover:text-transparent hover:bg-gradient-to-r hover:from-gradientEnd hover:to-gradientStart hover:scale-105"
              }`}
              onClick={() => handleFormatButtonClick("underline")}
            >
              U
            </button>
          </div>
          <img
            src={isFocused ? sendIcon : sendDisableIcon}
            alt="Send Icon"
            className="inline-block w-6 h-6 cursor-pointer"
            ref={refSubmitImg}
            onClick={handleSend}
          />
        </div>
      </div>
    </>
  );
};

export default AddNote;
