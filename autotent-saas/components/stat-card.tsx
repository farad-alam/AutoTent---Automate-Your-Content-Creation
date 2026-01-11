interface StatCardProps {
    title: string;
    value: string | number;
    icon: string;
    gradient: "primary" | "success" | "warning" | "info" | "danger";
    trend?: {
        value: string;
        isPositive: boolean;
    };
}

export default function StatCard({ title, value, icon, gradient, trend }: StatCardProps) {
    const gradientClasses = {
        primary: "gradient-primary",
        success: "gradient-success",
        warning: "gradient-warning",
        info: "gradient-info",
        danger: "gradient-danger",
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                        {title}
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        {value}
                    </p>
                    {trend && (
                        <div className="flex items-center space-x-1">
                            <span
                                className={`text-sm font-medium ${trend.isPositive ? "text-green-600" : "text-red-600"
                                    }`}
                            >
                                {trend.isPositive ? "↑" : "↓"} {trend.value}
                            </span>
                            <span className="text-xs text-gray-500">vs last month</span>
                        </div>
                    )}
                </div>
                <div className={`w-12 h-12 rounded-xl ${gradientClasses[gradient]} flex items-center justify-center`}>
                    <span className="text-2xl">{icon}</span>
                </div>
            </div>
        </div>
    );
}
