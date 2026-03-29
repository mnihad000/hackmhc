"use client";

import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, User, Settings, Bell, Grid } from "lucide-react";

const AnimatedMenuToggle = ({
  toggle,
  isOpen,
}: {
  toggle: () => void;
  isOpen: boolean;
}) => (
  <button onClick={toggle} aria-label="Toggle menu" className="z-[999] focus:outline-none">
    <motion.div animate={{ y: isOpen ? 13 : 0 }} transition={{ duration: 0.3 }}>
      <motion.svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        initial="closed"
        animate={isOpen ? "open" : "closed"}
        transition={{ duration: 0.3 }}
        className="text-black"
      >
        <motion.path
          fill="transparent"
          strokeWidth="3"
          stroke="currentColor"
          strokeLinecap="round"
          variants={{
            closed: { d: "M 2 2.5 L 22 2.5" },
            open: { d: "M 3 16.5 L 17 2.5" },
          }}
        />
        <motion.path
          fill="transparent"
          strokeWidth="3"
          stroke="currentColor"
          strokeLinecap="round"
          variants={{
            closed: { d: "M 2 12 L 22 12", opacity: 1 },
            open: { opacity: 0 },
          }}
          transition={{ duration: 0.2 }}
        />
        <motion.path
          fill="transparent"
          strokeWidth="3"
          stroke="currentColor"
          strokeLinecap="round"
          variants={{
            closed: { d: "M 2 21.5 L 22 21.5" },
            open: { d: "M 3 2.5 L 17 16.5" },
          }}
        />
      </motion.svg>
    </motion.div>
  </button>
);

const CollapsibleSection = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-4">
      <button
        className="flex w-full items-center justify-between rounded-xl px-4 py-2 hover:bg-gray-100"
        onClick={() => setOpen(!open)}
      >
        <span className="font-semibold">{title}</span>
        {open ? <XIcon /> : <MenuIcon />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="p-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const MenuIcon = () => (
  <motion.svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <motion.line x1="3" y1="12" x2="21" y2="12" />
  </motion.svg>
);

const XIcon = () => (
  <motion.svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <motion.line x1="18" y1="6" x2="6" y2="18" />
    <motion.line x1="6" y1="6" x2="18" y2="18" />
  </motion.svg>
);

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const mobileSidebarVariants = {
    hidden: { x: "-100%" },
    visible: { x: 0 },
  };

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <div className="flex h-screen">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={mobileSidebarVariants}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 bg-white text-black md:hidden"
          >
            <div className="flex h-full flex-col">
              <div className="border-b border-gray-200 p-4">
                <div className="flex items-center space-x-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200">
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-semibold">HextaUI</p>
                    <p className="text-sm text-gray-500">hi@preetsuthar.me</p>
                  </div>
                </div>
              </div>
              <nav className="flex-1 overflow-y-auto p-4">
                <ul>
                  <li className="mb-2">
                    <button className="flex w-full items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium hover:bg-gray-100">
                      <Home className="h-5 w-5" />
                      Home
                    </button>
                  </li>
                  <li className="mb-2">
                    <button className="flex w-full items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium hover:bg-gray-100">
                      <Bell className="h-5 w-5" />
                      Notifications
                    </button>
                  </li>
                  <li className="mb-2">
                    <button className="flex w-full items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium hover:bg-gray-100">
                      <Settings className="h-5 w-5" />
                      Settings
                    </button>
                  </li>
                </ul>
                <div className="mt-4">
                  <CollapsibleSection title="Extra Options">
                    <ul>
                      <li>
                        <button className="w-full rounded-xl p-2 text-left text-sm font-medium hover:bg-gray-100">
                          Subscriptions
                        </button>
                      </li>
                      <li>
                        <button className="w-full rounded-xl p-2 text-left text-sm font-medium hover:bg-gray-100">
                          Appearance
                        </button>
                      </li>
                    </ul>
                  </CollapsibleSection>
                  <CollapsibleSection title="More Info">
                    <p className="text-sm text-gray-500">
                      Additional details and settings can be found here.
                    </p>
                  </CollapsibleSection>
                </div>
              </nav>
              <div className="border-t border-gray-200 p-4">
                <button className="w-full rounded-xl bg-blue-100 p-2 text-center text-sm font-medium hover:bg-blue-200">
                  View profile
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed left-0 top-0 hidden h-full w-64 flex-col bg-white text-black shadow md:flex">
        <div className="border-b border-gray-200 p-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200">
              <User className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold">HextaUI</p>
              <p className="text-sm text-gray-500">hi@preetsuthar.me</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-4">
          <ul>
            <li className="mb-2">
              <button className="flex w-full items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium hover:bg-gray-100">
                <Home className="h-5 w-5" />
                Home
              </button>
            </li>
            <li className="mb-2">
              <button className="flex w-full items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium hover:bg-gray-100">
                <Bell className="h-5 w-5" />
                Notifications
              </button>
            </li>
            <li className="mb-2">
              <button className="flex w-full items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium hover:bg-gray-100">
                <Settings className="h-5 w-5" />
                Settings
              </button>
            </li>
            <li className="mb-2">
              <button className="flex w-full items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium hover:bg-gray-100">
                <Grid className="h-5 w-5" />
                Categories
              </button>
            </li>
          </ul>
          <div className="mt-4">
            <CollapsibleSection title="Extra Options">
              <ul>
                <li>
                  <button className="w-full rounded-xl p-2 text-left text-sm font-medium hover:bg-gray-100">
                    Subscriptions
                  </button>
                </li>
                <li>
                  <button className="w-full rounded-xl p-2 text-left text-sm font-medium hover:bg-gray-100">
                    Appearance
                  </button>
                </li>
              </ul>
            </CollapsibleSection>
            <CollapsibleSection title="More Info">
              <p className="text-sm text-gray-500">
                Additional details and settings can be found here.
              </p>
            </CollapsibleSection>
          </div>
        </nav>
        <div className="border-t border-gray-200 p-4">
          <button className="w-full rounded-xl bg-blue-100 p-2 text-center text-sm font-medium hover:bg-blue-200">
            View profile
          </button>
        </div>
      </div>

      <div className="ml-0 flex-1 transition-all duration-300 md:ml-64">
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-100 p-4 md:hidden">
          <h1 className="text-xl font-bold">Main Content</h1>
          <AnimatedMenuToggle toggle={toggleSidebar} isOpen={isOpen} />
        </div>
        <div className="p-6">
          <h1 className="text-2xl font-bold">Main Content</h1>
          <p className="text-sm font-medium">Additional details and settings can be found here.</p>
        </div>
      </div>
    </div>
  );
};

export { Sidebar };
