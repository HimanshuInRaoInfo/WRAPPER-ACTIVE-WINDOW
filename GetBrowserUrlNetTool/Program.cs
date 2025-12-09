using System;
using System.Diagnostics;
using BrowserAutomation;

namespace GetBrowserUrlNetTool
{
    internal static class Program
    {
        static void Main(string[] args)
        {
            if (args.Length == 0) {
                Console.WriteLine("Usage: GetBrowserUrlNetTool <PID>");
                Console.WriteLine();
                Console.WriteLine("Common running browser processes and PIDs (if any):");
                foreach (var p in Process.GetProcessesByName("chrome"))
                    Console.WriteLine($"chrome PID={p.Id}");
                foreach (var p in Process.GetProcessesByName("msedge"))
                    Console.WriteLine($"msedge PID={p.Id}");
                return;
            }

            if (!int.TryParse(args[0], out int pid))
            {
                Console.WriteLine("INVALID_PID");
                return;
            }

            try {
                var url = BrowserAddressBarReader.GetBrowserAddressBarUrl(pid, TimeSpan.FromSeconds(5));
                Console.WriteLine(url ?? "URL_NOT_FOUND");
            } catch
            {
                Console.WriteLine("ERROR_GET");
            }
        }
    }
}