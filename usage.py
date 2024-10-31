import pandas as pd
import matplotlib.pyplot as plt
import argparse
import sys
import os
import glob

# Set pandas options to avoid truncation
pd.set_option('display.max_rows', None)
pd.set_option('display.max_columns', None)
pd.set_option('display.width', 1000)
pd.set_option('display.float_format', '{:,.2f}'.format)

def find_latest_file(directory, extension=".csv"):
    list_of_files = glob.glob(f'{directory}/*{extension}')
    if not list_of_files:
        print(f"No files with extension {extension} found in {directory}")
        sys.exit(1)

    latest_file = max(list_of_files, key=os.path.getctime)
    return latest_file

def load_watch_list(file_path):
    try:
        with open(file_path, 'r') as file:
            emails = [line.strip() for line in file.readlines()]
        return emails
    except FileNotFoundError:
        print(f"Error: The file {file_path} does not exist.")
        sys.exit(1)

def summarize_usage(api_df, ws_df, overage_df=None, start_rank=0, end_rank=0):
    # Summarize API usage
    api_summary = api_df.groupby('email')['usage'].sum().reset_index().rename(columns={'usage': 'api-usage'})
    ws_summary = ws_df.groupby('email')['cus'].sum().reset_index().rename(columns={'cus': 'ws-usage'})

    # Merge API and WebSocket usage summaries
    summary = pd.merge(api_summary, ws_summary, on='email', how='outer').fillna(0)

    # Calculate total usage
    summary['total-usage'] = summary['api-usage'] + summary['ws-usage']

    # Sort by total usage unless overage_df is present
    if overage_df is not None:
        summary = pd.merge(summary, overage_df[['email', 'overage', 'overageCost']], on='email', how='left').fillna(0)
        summary = summary[summary['overage'] > 0]  # Only show emails with overage > 0
        summary = summary.sort_values(by='overage', ascending=False)
    else:
        summary = summary.sort_values(by='total-usage', ascending=False)

    # Apply rank filtering if specified
    if start_rank > 0 or end_rank > 0:
        start_rank = max(0, start_rank)
        end_rank = end_rank or len(summary)  # If end_rank is not specified, show all
        summary = summary.iloc[start_rank:end_rank]

    return summary.reset_index(drop=True)  # Reset index for consistent numbering

def show_details(api_df, ws_df, email):
    print(f"\nDetailed usage for {email}:")

    # API endpoint usage
    api_usage = api_df[api_df['email'] == email].copy()
    if not api_usage.empty:
        api_usage_summary = api_usage.groupby('endpoint')['usage'].sum().reset_index().sort_values(by='usage', ascending=False)
        api_usage_summary['usage'] = api_usage_summary['usage'].map('{:,.0f}'.format)
        print("\nAPI Usage by Endpoint:")
        print(api_usage_summary.to_string(index=False))
    else:
        print("\nNo API usage data available for this email.")

    # WebSocket usage
    ws_usage = ws_df[ws_df['email'] == email].copy()
    if not ws_usage.empty:
        ws_usage_summary = ws_usage.groupby('type')['cus'].sum().reset_index().sort_values(by='cus', ascending=False)
        ws_usage_summary['cus'] = ws_usage_summary['cus'].map('{:,.2f}'.format)
        print("\nWebSocket Usage by Type:")
        print(ws_usage_summary.to_string(index=False))

    # Show total combined usage
    total_usage = api_usage['usage'].sum() + ws_usage['cus'].sum()
    print(f"\nTotal Usage for {email}: {total_usage:,.0f}")

def print_table_with_usage(df, show_overage=False):
    if show_overage:
        print(f"\n{'No':<5}{'Email':<40}{'API Usage':>20}{'WS Usage':>20}{'Total Usage':>20}{'Overage':>20}{'OverageCost':>20}")
        print("="*145)
        for i, row in df.iterrows():
            print(f"{i + 1:<5}{row['email']:<40}{row['api-usage']:>20,.0f}{row['ws-usage']:>20,.0f}{row['total-usage']:>20,.0f}{row['overage']:>20,.0f}{row['overageCost']:>20,.2f}")
        print("="*145)
    else:
        print(f"\n{'No':<5}{'Email':<40}{'API Usage':>20}{'WS Usage':>20}{'Total Usage':>20}")
        print("="*90)
        for i, row in df.iterrows():
            print(f"{i + 1:<5}{row['email']:<40}{row['api-usage']:>20,.0f}{row['ws-usage']:>20,.0f}{row['total-usage']:>20,.0f}")
        print("="*90)

def main():
    parser = argparse.ArgumentParser(description='Process API, WebSocket, and Overage usage data.')
    parser.add_argument('--s', type=int, default=0, help='Start rank for range query (default is 0)')
    parser.add_argument('--e', type=int, default=0, help='End rank for range query (default is all)')
    parser.add_argument('--f', type=int, default=0, help='Filter to show emails with total usage >= this value (in millions)')
    parser.add_argument('--m', type=str, help='Search for an email containing the given string')
    parser.add_argument('--o', action='store_true', help='Find overage details')
    parser.add_argument('--w', action='store_true', help='Show usage for emails in watch-list.txt')
    parser.add_argument('emails', nargs='*', type=str, help='User emails to filter data (optional)')

    args = parser.parse_args()

    # Directories containing the CSV files
    api_directory = "../usage_per_endpoint"
    ws_directory = "../usage_per_ws"
    overage_directory = "../usage_per_paid_user"

    # Find the latest API and WS files
    api_file = find_latest_file(api_directory)
    ws_file = find_latest_file(ws_directory)

    # Load the CSV files
    api_df = pd.read_csv(api_file)
    ws_df = pd.read_csv(ws_file)

    # Ensure columns are numeric
    api_df['usage'] = pd.to_numeric(api_df['usage'], errors='coerce').fillna(0)
    ws_df['cus'] = pd.to_numeric(ws_df['cus'], errors='coerce').fillna(0)

    overage_df = None
    if args.o:
        overage_file = find_latest_file(overage_directory)
        overage_df = pd.read_csv(overage_file)
        overage_df['usage'] = pd.to_numeric(overage_df['usage'], errors='coerce').fillna(0)
        overage_df['overage'] = pd.to_numeric(overage_df['overage'], errors='coerce').fillna(0)
        overage_df['overageCost'] = pd.to_numeric(overage_df['overageCost'], errors='coerce').fillna(0)

    # Apply the filter for total usage if --f is specified
    if args.f > 0:
        usage_filter = args.f * 1_000_000  # Convert millions to the actual number
        summary = summarize_usage(api_df, ws_df, overage_df)
        summary = summary[summary['total-usage'] >= usage_filter]
    else:
        summary = summarize_usage(api_df, ws_df, overage_df, start_rank=args.s, end_rank=args.e)

    if args.m:
        # Search for emails that contain the provided string
        matching_emails = summary[summary['email'].str.contains(args.m, case=False, na=False)]['email'].unique()
        if len(matching_emails) > 0:
            print("Emails matching your search:")
            for i, email in enumerate(matching_emails):
                print(f"{i + 1}: {email}")
            choice = input("Enter the number corresponding to the email you want to select: ")
            try:
                selected_email = matching_emails[int(choice) - 1]
            except (IndexError, ValueError):
                print("Invalid selection. Exiting.")
                sys.exit(1)
            args.emails = [selected_email]
        else:
            print("No emails found matching your search.")
            sys.exit(0)

    if args.w:
        # Load watch list and filter the summary
        emails = load_watch_list("./watch-list.txt")
        summary = summary[summary['email'].isin(emails)]

    if args.emails:
        summary = summarize_usage(api_df, ws_df, overage_df)
        summary = summary[summary['email'].isin(args.emails)].reset_index(drop=True)
        print_table_with_usage(summary)

        # Allow selection for details
        while True:
            selected_number = input("\nEnter the number of the email to see the detailed summary, type 'y' to return to the menu, or 'n' to quit: ")
            if selected_number.lower() == 'y':
                break
            elif selected_number.lower() == 'n':
                sys.exit()

            if selected_number.isdigit():
                selected_index = int(selected_number) - 1
                if 0 <= selected_index < len(summary):
                    selected_email = summary.iloc[selected_index]['email']
                    show_details(api_df, ws_df, selected_email)

    else:
        # Display summary of usage
        print_table_with_usage(summary, show_overage=args.o)

if __name__ == "__main__":
    main()
