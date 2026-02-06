"use client";

import { useState } from "react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardSkeleton,
  Input,
  SearchInput,
  Textarea,
  Badge,
  StatusDot,
  Avatar,
  AvatarGroup,
  Dropdown,
  DropdownItem,
  DropdownSeparator,
  DropdownLabel,
  SelectDropdown,
} from "@/components/ui";
import {
  Plus,
  Settings,
  Download,
  Trash2,
  MoreHorizontal,
  User,
  LogOut,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  BarChart3,
  Target,
} from "lucide-react";
import toast from "react-hot-toast";

export default function Home() {
  const [selectValue, setSelectValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLoadingDemo = () => {
    setIsLoading(true);
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 2000)),
      {
        loading: "Processing...",
        success: "Action completed!",
        error: "Something went wrong",
      }
    ).finally(() => setIsLoading(false));
  };

  return (
    <main className="min-h-screen bg-surface-1 p-8">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-text-primary">
            QRev Lite
          </h1>
          <p className="text-text-secondary">
            Superhuman-inspired dark mode component library
          </p>
        </header>

        {/* Buttons Section */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-text-primary">Buttons</h2>
          <div className="flex flex-wrap gap-4">
            <Button variant="primary" onClick={() => toast.success("Primary clicked!")}>
              Primary
            </Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
          </div>
          <div className="flex flex-wrap gap-4">
            <Button size="sm" leftIcon={<Plus className="h-3 w-3" />}>
              Small
            </Button>
            <Button size="md" leftIcon={<Download className="h-4 w-4" />}>
              Medium
            </Button>
            <Button size="lg" leftIcon={<Settings className="h-5 w-5" />}>
              Large
            </Button>
          </div>
          <div className="flex flex-wrap gap-4">
            <Button isLoading={isLoading} onClick={handleLoadingDemo}>
              Click to Load
            </Button>
            <Button disabled>Disabled</Button>
          </div>
        </section>

        {/* Cards Section */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-text-primary">Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-status-success" />
                  Revenue
                </CardTitle>
                <CardDescription>Q4 2024 total revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-text-primary">$2.4M</div>
                <div className="flex items-center gap-1 mt-1 text-sm">
                  <TrendingUp className="h-4 w-4 text-status-success" />
                  <span className="text-status-success">+12.5%</span>
                  <span className="text-text-muted">vs last quarter</span>
                </div>
              </CardContent>
            </Card>

            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-status-info" />
                  Active Users
                </CardTitle>
                <CardDescription>Monthly active users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-text-primary">14,523</div>
                <div className="flex items-center gap-1 mt-1 text-sm">
                  <TrendingDown className="h-4 w-4 text-status-error" />
                  <span className="text-status-error">-3.2%</span>
                  <span className="text-text-muted">vs last month</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-status-warning" />
                  Goal Progress
                </CardTitle>
                <CardDescription>Q4 target completion</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-text-primary">78%</div>
                <div className="w-full bg-surface-4 rounded-full h-2 mt-3">
                  <div className="bg-accent h-2 rounded-full" style={{ width: "78%" }} />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Card with Footer</CardTitle>
                <CardDescription>Demonstrates footer actions</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-text-secondary">
                  Cards can include footers for actions or additional information.
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="secondary" size="sm">Cancel</Button>
                <Button size="sm">Save Changes</Button>
              </CardFooter>
            </Card>

            <CardSkeleton />
          </div>
        </section>

        {/* Inputs Section */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-text-primary">Inputs</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
            <Input placeholder="Default input" />
            <SearchInput placeholder="Search everything..." />
            <Input placeholder="With error" error="This field is required" />
            <Input placeholder="Disabled" disabled />
          </div>
          <div className="max-w-md">
            <Textarea placeholder="Write a note..." />
          </div>
        </section>

        {/* Badges Section */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-text-primary">Badges</h2>
          <div className="flex flex-wrap gap-3">
            <Badge>Default</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="error">Error</Badge>
            <Badge variant="info">Info</Badge>
            <Badge variant="outline">Outline</Badge>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <StatusDot status="online" />
              <span className="text-sm text-text-secondary">Online</span>
            </div>
            <div className="flex items-center gap-2">
              <StatusDot status="busy" />
              <span className="text-sm text-text-secondary">Busy</span>
            </div>
            <div className="flex items-center gap-2">
              <StatusDot status="away" />
              <span className="text-sm text-text-secondary">Away</span>
            </div>
            <div className="flex items-center gap-2">
              <StatusDot status="offline" />
              <span className="text-sm text-text-secondary">Offline</span>
            </div>
          </div>
        </section>

        {/* Avatars Section */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-text-primary">Avatars</h2>
          <div className="flex items-center gap-4">
            <Avatar size="xs" fallback="XS" />
            <Avatar size="sm" fallback="SM" />
            <Avatar size="md" fallback="John Doe" />
            <Avatar size="lg" src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" />
            <Avatar size="xl" fallback="XL" />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-text-muted">Avatar Group:</p>
            <AvatarGroup max={4}>
              <Avatar fallback="John Doe" />
              <Avatar fallback="Jane Smith" />
              <Avatar fallback="Bob Wilson" />
              <Avatar fallback="Alice Brown" />
              <Avatar fallback="Charlie Davis" />
              <Avatar fallback="Eve Johnson" />
            </AvatarGroup>
          </div>
        </section>

        {/* Dropdowns Section */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-text-primary">Dropdowns</h2>
          <div className="flex flex-wrap gap-4">
            <Dropdown
              trigger={
                <Button variant="secondary" rightIcon={<MoreHorizontal className="h-4 w-4" />}>
                  Actions
                </Button>
              }
            >
              <DropdownLabel>Account</DropdownLabel>
              <DropdownItem icon={<User className="h-4 w-4" />}>Profile</DropdownItem>
              <DropdownItem icon={<Settings className="h-4 w-4" />}>Settings</DropdownItem>
              <DropdownItem icon={<HelpCircle className="h-4 w-4" />}>Help</DropdownItem>
              <DropdownSeparator />
              <DropdownItem icon={<LogOut className="h-4 w-4" />} destructive>
                Log out
              </DropdownItem>
            </Dropdown>

            <SelectDropdown
              value={selectValue}
              onChange={setSelectValue}
              placeholder="Select quarter..."
              options={[
                { value: "q1", label: "Q1 2024" },
                { value: "q2", label: "Q2 2024" },
                { value: "q3", label: "Q3 2024" },
                { value: "q4", label: "Q4 2024" },
              ]}
            />
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-8 border-t border-border">
          <p className="text-sm text-text-muted text-center">
            Built with Next.js 14, Tailwind CSS, and Superhuman design principles
          </p>
        </footer>
      </div>
    </main>
  );
}
