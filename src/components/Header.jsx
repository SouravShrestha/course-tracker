'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const Header = () => {
  const router = useRouter();

  return (
    <div className="h-20 w-full bg-primarydark border-b border-colorborder px-5 py-2 flex items-center select-none">
      <div className="cursor-pointer flex items-center" onClick={() => router.push('/')}>
        <Image src="/images/logo.png" alt="Logo" width={24} height={24} className="h-6 w-auto mr-4" />
        <div>
          <p className="text-xl">we-track</p>
          <p className="text-xxs mt-2">
            Made with <span role="img" aria-label="Love">ꨄ︎</span> by Sourav
          </p>
        </div>
      </div>
    </div>
  );
};

export default Header;
