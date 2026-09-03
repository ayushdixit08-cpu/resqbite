const now = new Date();
const iso = (minutesAgo) => new Date(now.getTime() - minutesAgo * 60000).toISOString();

export const mockFoodRequests = [
  { requestId: 101, organizationId: 1, organizationName: "Hope Foundation", foodName: "Cooked Meals", servingsNeeded: 50, location: "Agra", status: "OPEN", priority: "HIGH" },
  { requestId: 102, organizationId: 2, organizationName: "Helping Hands NGO", foodName: "Rice and Curry", servingsNeeded: 100, location: "Delhi", status: "OPEN", priority: "MEDIUM" },
];

export const mockFoodDonations = [
  { donationId: 501, donorId: 11, donorName: "Rajesh Kumar", requestId: 101, foodName: "Thali", servings: 20, pickupLocation: "Agra", status: "AVAILABLE" },
];

export const mockAvailableFood = [
  { id: "demo-601", name: "Veg Biryani", quantity: "40 portions", meals: 40, category: "Prepared Meals", provider: "Grand Palace Banquet Hall", pickupTime: "6:00 PM - 8:00 PM", location: "MG Road, Agra", status: "Available" },
  { id: "demo-602", name: "Bread & Bakery Assortment", quantity: "25 boxes", meals: 25, category: "Bakery", provider: "Sunrise Bakery", pickupTime: "5:30 PM - 7:00 PM", location: "Sadar Bazaar, Agra", status: "Available" },
  { id: "demo-603", name: "Fruit Basket", quantity: "60 units", meals: 60, category: "Fruits & Vegetables", provider: "FreshMart Wholesale", pickupTime: "4:00 PM - 6:00 PM", location: "Sanjay Place, Agra", status: "Available" },
  { id: "demo-604", name: "Paneer Curry & Rice", quantity: "45 servings", meals: 45, category: "Vegetarian", provider: "Spice Route Restaurant", pickupTime: "7:00 PM - 9:00 PM", location: "Fatehabad Road, Agra", status: "Available" },
  { id: "demo-605", name: "Sandwich Platter", quantity: "30 pieces", meals: 30, category: "Prepared Meals", provider: "Cafe Mocha", pickupTime: "3:00 PM - 5:00 PM", location: "Tajganj, Agra", status: "Available" },
  { id: "demo-606", name: "Mixed Vegetable Box", quantity: "20 units", meals: 20, category: "Fruits & Vegetables", provider: "Annapurna Kitchen", pickupTime: "2:00 PM - 4:00 PM", location: "Kamla Nagar, Agra", status: "Available" },
];

export const mockDeliveryTasks = [
  { taskId: 701, donationId: 501, requestId: 101, volunteerId: 21, pickupLocation: "Agra", deliveryLocation: "Hope Foundation, Agra", foodName: "Thali", servings: 20, status: "OUT_FOR_DELIVERY" },
];

export const mockTracking = {
  donation: {
    id: "501",
    title: "Thali",
    quantity: 20,
    quantity_unit: "servings",
    pickup_city: "Agra",
    pickup_address: "Agra",
    status: "out_for_delivery",
    updated_at: iso(4),
    expiry_time: new Date(now.getTime() + 3 * 3600000).toISOString(),
  },
  volunteer: { name: "Amit Sharma", phone: "+91 98765 43210" },
  organization: { name: "Hope Foundation", organization_name: "Hope Foundation" },
  timeline: [
    { status: "pending", created_at: iso(90), note: "Donation is available for pickup." },
    { status: "accepted", created_at: iso(65), note: "Volunteer accepted the delivery task." },
    { status: "picked_up", created_at: iso(35), note: "Food collected from the donor." },
    { status: "out_for_delivery", created_at: iso(10), note: "Food is on its way to the organization." },
  ],
};
