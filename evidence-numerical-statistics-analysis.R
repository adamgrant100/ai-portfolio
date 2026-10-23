library(haven)

# Load data
# Replace filename with the actual .sav file name used locally
data <- read_sav("your_file_name.sav")

# Convert labelled variables
data$diabetes_group <- as_factor(data$diabetes)
data$occupation_group <- as_factor(data$occupation)

# Mode function
get_mode <- function(x) {
  x <- na.omit(x)
  ux <- unique(x)
  ux[tabulate(match(x, ux)) == max(tabulate(match(x, ux)))]
}

# Age summary
mean(data$age, na.rm = TRUE)
median(data$age, na.rm = TRUE)
get_mode(data$age)

# Median DBP by diabetes status
tapply(data$dbp, data$diabetes_group, median, na.rm = TRUE)

# Wilcoxon rank-sum test
wilcox.test(dbp ~ diabetes_group, data = data, exact = FALSE)

# Mean SBP by occupation group
aggregate(sbp ~ occupation_group, data = data, mean, na.rm = TRUE)

# One-way ANOVA
anova_result <- aov(sbp ~ occupation_group, data = data)
summary(anova_result)