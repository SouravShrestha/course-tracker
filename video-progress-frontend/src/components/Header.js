import React from "react";
import { useNavigate } from "react-router-dom";
import logoImg from "../assets/images/logo.png";

const Header = () => {
  const navigate = useNavigate();
  const handleLogoClick = () => {
    navigate("/"); // Navigates to the home page
  };

  return (
    <>
      <div className="h-20 w-full bg-primarydark border-b border-colorborder px-5 py-2 flex items-center select-none">
        <div className="cursor-pointer flex items-center" onClick={handleLogoClick}>
          {/* Logo Image */}
          <img src={logoImg} alt="Logo" className="h-6 mr-4" />
          <div>
            <p className="text-xl">course-tracker</p>
            <p className="text-xxs mt-2">
              Made with{" "}
              <span role="img" aria-label="Love">
                ᡣ𐭩
              </span>{" "}
              by Sourav
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Header;
